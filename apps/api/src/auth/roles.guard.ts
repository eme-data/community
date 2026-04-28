import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user: { userId?: string; tenantId?: string } | undefined = req.user;
    if (!user?.userId || !user.tenantId) {
      throw new ForbiddenException('Authentication required');
    }

    const m = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.userId, tenantId: user.tenantId } },
      select: { role: true },
    });
    if (!m || !required.includes(m.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
