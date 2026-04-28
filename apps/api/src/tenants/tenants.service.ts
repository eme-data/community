import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembership(userId: string, tenantId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this tenant');
    return m;
  }

  async findById(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  listForUser(userId: string) {
    return this.prisma.tenant.findMany({
      where: { memberships: { some: { userId } } },
      include: { memberships: { where: { userId }, select: { role: true } } },
    });
  }
}
