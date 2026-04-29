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
