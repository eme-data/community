import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TwoFactorService } from './twofa.service';

const RESET_TTL_MS = 1000 * 60 * 60; // 1h
const TWOFA_CHALLENGE_TTL = '5m';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly twofa: TwoFactorService,
  ) {}

  async register(input: { email: string; password: string; name?: string; tenantName: string; tenantSlug: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: input.tenantSlug } });
    if (slugTaken) throw new BadRequestException('Tenant slug already taken');

    // Bootstrap: the very first user on a fresh instance becomes super-admin
    // so the SaaS operator can finish setup (plateforme-level OAuth, etc.)
    // without a manual DB tweak. Subsequent users are regular tenant owners.
    const userCount = await this.prisma.user.count();
    const isFirstUser = userCount === 0;

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        isSuperAdmin: isFirstUser,
        memberships: {
          create: {
            role: 'OWNER',
            tenant: {
              create: { slug: input.tenantSlug, name: input.tenantName },
            },
          },
        },
      },
      include: { memberships: { include: { tenant: true } } },
    });

    // Welcome email — fire-and-forget so registration never blocks on SMTP.
    this.mail
      .send(
        user.email,
        'Bienvenue sur Community',
        renderWelcomeHtml(user.name, input.tenantName, isFirstUser),
      )
      .catch(() => undefined);

    return this.issueToken(user.id, user.memberships[0].tenantId);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { tenant: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (user.memberships.length === 0) throw new UnauthorizedException('No tenant assigned');

    if (user.totpEnabledAt) {
      // Issue a short-lived challenge token; the client then exchanges it
      // for a real session by submitting the TOTP code.
      const challenge = this.jwt.sign(
        { sub: user.id, twoFactor: 'pending' },
        { expiresIn: TWOFA_CHALLENGE_TTL },
      );
      return { twoFactorRequired: true as const, challenge };
    }

    return this.issueToken(user.id, user.memberships[0].tenantId);
  }

  async verifyTwoFactor(challenge: string, code: string) {
    let payload: { sub: string; twoFactor?: string };
    try {
      payload = this.jwt.verify(challenge);
    } catch {
      throw new UnauthorizedException('Invalid or expired challenge');
    }
    if (payload.twoFactor !== 'pending') throw new UnauthorizedException('Invalid challenge');

    await this.twofa.verifyForLogin(payload.sub, code);

    const m = await this.prisma.membership.findFirst({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'asc' },
    });
    if (!m) throw new UnauthorizedException('No tenant assigned');
    return this.issueToken(payload.sub, m.tenantId);
  }

  async switchTenant(userId: string, tenantId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this tenant');
    return this.issueToken(userId, tenantId);
  }

  /** Always returns ok — never reveals whether the email exists. */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true };

    if (!this.mail.isEnabled()) {
      // Without SMTP, expose the token in logs so the operator can complete
      // the flow during development. Never do this with SMTP enabled.
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await this.prisma.passwordReset.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      // eslint-disable-next-line no-console
      console.log(`[mail-disabled] Password reset link: ${process.env.APP_URL}/reset-password?token=${rawToken}`);
      return { ok: true };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });

    const url = `${process.env.APP_URL || ''}/reset-password?token=${rawToken}`;
    const html = `
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p><a href="${url}">${url}</a></p>
      <p>Ce lien expire dans 1h. Si vous n'êtes pas à l'origine de la demande, ignorez ce message.</p>`;
    await this.mail.send(user.email, 'Réinitialisation de votre mot de passe — Community', html);
    return { ok: true };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!record) throw new BadRequestException('Invalid token');
    if (record.consumedAt) throw new BadRequestException('Token already used');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expired');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      // Invalidate any other outstanding reset tokens for this user
      this.prisma.passwordReset.updateMany({
        where: { userId: record.userId, consumedAt: null, id: { not: record.id } },
        data: { consumedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  private issueToken(userId: string, tenantId: string) {
    const token = this.jwt.sign({ sub: userId, tenantId });
    return { accessToken: token, tenantId, userId };
  }
}

function renderWelcomeHtml(name: string | null | undefined, orgName: string, isFirstUser: boolean): string {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,';
  const appUrl = process.env.APP_URL || '';
  const adminBlock = isFirstUser
    ? `<p>Vous êtes le premier utilisateur de cette instance et avez donc reçu le rôle <strong>super-admin</strong>.
       Pensez à configurer les providers OAuth depuis <em>Paramètres → Providers OAuth</em> pour que tous vos
       espaces puissent connecter leurs comptes sociaux sans avoir à fournir leurs propres credentials.</p>`
    : '';
  return `
    <p>${greeting}</p>
    <p>Bienvenue sur Community ! Votre espace <strong>${escapeHtml(orgName)}</strong> est prêt.</p>
    <p>Prochaines étapes :</p>
    <ol>
      <li>Confirmez votre adresse email (vous recevrez un lien dédié dans un instant).</li>
      <li>Connectez votre premier réseau social.</li>
      <li>Créez ou planifiez votre première publication.</li>
    </ol>
    ${adminBlock}
    <p><a href="${appUrl}/onboarding">Reprendre la configuration →</a></p>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
