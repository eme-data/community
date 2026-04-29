import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true, totpEnabledAt: true, isSuperAdmin: true },
    });
  }

  /**
   * GDPR / RGPD data portability — returns every record tied to this user
   * across all tenants where they are a member. Secrets (passwords, OAuth
   * tokens, TOTP) are excluded.
   */
  async exportAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        emailVerifiedAt: true,
        totpEnabledAt: true,
        isSuperAdmin: true,
        memberships: {
          select: {
            role: true,
            createdAt: true,
            tenant: {
              select: { id: true, slug: true, name: true, plan: true, createdAt: true },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException();

    const tenantIds = user.memberships.map((m) => m.tenant.id);

    const [posts, audit, notifications, apiKeys] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorUserId: userId },
        select: {
          id: true, tenantId: true, content: true, status: true,
          scheduledAt: true, publishedAt: true, createdAt: true,
          targets: {
            select: {
              id: true, status: true, providerUrl: true, providerPostId: true,
              publishedAt: true, errorMessage: true,
              account: { select: { provider: true, displayName: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { OR: [{ userId }, { tenantId: { in: tenantIds } }] },
        select: { createdAt: true, tenantId: true, action: true, target: true, ip: true, payload: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: { type: true, title: true, body: true, link: true, createdAt: true, readAt: true },
      }),
      this.prisma.apiKey.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { name: true, prefix: true, createdAt: true, lastUsedAt: true, tenantId: true },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      schemaVersion: 1,
      user,
      posts,
      auditLogs: audit,
      notifications,
      apiKeys,
    };
  }

  /**
   * GDPR account deletion. Removes the user and any tenant they own solo
   * (i.e. tenants with no other OWNER). Tenants where they're not the only
   * owner are simply detached via membership cascade.
   */
  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { tenant: { include: { memberships: true } } } } },
    });
    if (!user) throw new NotFoundException();

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new BadRequestException('Wrong password');

    // Tenants where this user is the only OWNER → delete (cascades posts, accounts, …).
    const soloTenants = user.memberships.filter((m) => {
      if (m.role !== 'OWNER') return false;
      const otherOwners = m.tenant.memberships.filter(
        (mm) => mm.role === 'OWNER' && mm.userId !== userId,
      );
      return otherOwners.length === 0;
    });

    await this.prisma.$transaction([
      ...soloTenants.map((m) =>
        this.prisma.tenant.delete({ where: { id: m.tenantId } }),
      ),
      // The user delete cascades the remaining memberships, password resets,
      // email verifications, and backup codes via Prisma onDelete: Cascade.
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    return { ok: true, deletedTenantIds: soloTenants.map((m) => m.tenantId) };
  }
}
