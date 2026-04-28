import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, invitedByUserId: string, email: string, role: Role) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // If the email is already a member, no point inviting again.
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const m = await this.prisma.membership.findUnique({
        where: { userId_tenantId: { userId: existingUser.id, tenantId } },
      });
      if (m) throw new ConflictException('User is already a member of this tenant');
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email,
        role,
        tokenHash,
        invitedByUserId,
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });

    const url = `${process.env.APP_URL || ''}/accept-invite?token=${rawToken}`;
    const html = `
      <p>Vous avez été invité(e) à rejoindre <strong>${tenant.name}</strong> sur Community en tant que ${role}.</p>
      <p>Cliquez ici pour accepter : <a href="${url}">${url}</a></p>
      <p>Ce lien expire dans 7 jours.</p>`;
    await this.mail.send(email, `Invitation à rejoindre ${tenant.name} — Community`, html);

    await this.audit.log({
      tenantId,
      userId: invitedByUserId,
      action: 'invitation.sent',
      target: invitation.id,
      payload: { email, role },
    });

    return { id: invitation.id, email, role, expiresAt: invitation.expiresAt };
  }

  list(tenantId: string) {
    return this.prisma.invitation.findMany({
      where: { tenantId, consumedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    });
  }

  async revoke(tenantId: string, id: string) {
    const inv = await this.prisma.invitation.findFirst({ where: { id, tenantId } });
    if (!inv) throw new NotFoundException('Invitation not found');
    await this.prisma.invitation.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Public token preview — used by the accept page to show the user where they're being invited.
   * Returns minimal info; never the token itself.
   */
  async preview(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const inv = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    if (!inv || inv.consumedAt || inv.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: inv.tenantId },
      select: { name: true, slug: true },
    });
    const userExists = !!(await this.prisma.user.findUnique({
      where: { email: inv.email },
      select: { id: true },
    }));
    return { email: inv.email, role: inv.role, tenant, userExists };
  }

  async accept(rawToken: string, payload: { name?: string; password?: string }) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const inv = await this.prisma.invitation.findUnique({ where: { tokenHash } });
    if (!inv) throw new BadRequestException('Invalid invitation');
    if (inv.consumedAt) throw new BadRequestException('Invitation already used');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    let user = await this.prisma.user.findUnique({ where: { email: inv.email } });

    if (!user) {
      if (!payload.password || payload.password.length < 8) {
        throw new BadRequestException('Password (≥ 8 chars) is required to create your account');
      }
      const passwordHash = await bcrypt.hash(payload.password, 12);
      user = await this.prisma.user.create({
        data: {
          email: inv.email,
          passwordHash,
          name: payload.name,
          // Email is implicitly verified — they used the link from the invite mail.
          emailVerifiedAt: new Date(),
        },
      });
    }

    await this.prisma.$transaction([
      this.prisma.membership.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: inv.tenantId } },
        update: { role: inv.role },
        create: { userId: user.id, tenantId: inv.tenantId, role: inv.role },
      }),
      this.prisma.invitation.update({
        where: { id: inv.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await this.audit.log({
      tenantId: inv.tenantId,
      userId: user.id,
      action: 'invitation.accepted',
      target: inv.id,
      payload: { email: inv.email, role: inv.role },
    });

    return { userId: user.id, tenantId: inv.tenantId };
  }
}
