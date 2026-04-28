import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const STEPS = ['welcome', 'verify', 'connect', 'first_post', 'done'] as const;
type Step = (typeof STEPS)[number];

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getStatus(userId: string, tenantId: string) {
    const [user, tenant, accountsCount, postsCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, emailVerifiedAt: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, slug: true, plan: true, onboardingStep: true, onboardingCompletedAt: true },
      }),
      this.prisma.socialAccount.count({ where: { tenantId } }),
      this.prisma.post.count({ where: { tenantId } }),
    ]);
    if (!user || !tenant) throw new NotFoundException();

    return {
      user,
      tenant,
      progress: {
        emailVerified: !!user.emailVerifiedAt || !this.mail.isEnabled(),
        accountConnected: accountsCount > 0,
        firstPostCreated: postsCount > 0,
        completed: !!tenant.onboardingCompletedAt,
      },
      mailEnabled: this.mail.isEnabled(),
    };
  }

  /** Send (or re-send) a verification email. Idempotent — generates a fresh token. */
  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };

    // Auto-verify in dev when no SMTP configured.
    if (!this.mail.isEnabled()) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
      return { ok: true, alreadyVerified: true, autoVerified: true };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.emailVerification.create({
      data: { userId, tokenHash, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    });

    const url = `${process.env.APP_URL || ''}/onboarding/verify?token=${rawToken}`;
    const html = `
      <p>Bonjour${user.name ? ' ' + escapeHtml(user.name) : ''},</p>
      <p>Confirmez votre adresse email pour activer votre compte Community :</p>
      <p><a href="${url}">${url}</a></p>
      <p>Ce lien expire dans 24h.</p>`;

    await this.mail.send(user.email, 'Confirmez votre email — Community', html);
    return { ok: true };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.emailVerification.findUnique({ where: { tokenHash } });
    if (!record) throw new BadRequestException('Invalid token');
    if (record.consumedAt) throw new BadRequestException('Token already used');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expired');

    await this.prisma.$transaction([
      this.prisma.emailVerification.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  async setStep(tenantId: string, step: Step) {
    if (!STEPS.includes(step)) throw new BadRequestException('Invalid step');
    const data: any = { onboardingStep: step };
    if (step === 'done') data.onboardingCompletedAt = new Date();
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async complete(tenantId: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: 'done', onboardingCompletedAt: new Date() },
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
