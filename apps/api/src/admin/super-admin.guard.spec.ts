import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  function makeGuard(prismaUser: { isSuperAdmin: boolean } | null) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(prismaUser) },
    } as any;
    return { guard: new SuperAdminGuard(prisma), prisma };
  }

  it('allows a super admin', async () => {
    const { guard } = makeGuard({ isSuperAdmin: true });
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('rejects a regular user', async () => {
    const { guard } = makeGuard({ isSuperAdmin: false });
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when user not found in DB', async () => {
    const { guard } = makeGuard(null);
    await expect(guard.canActivate(makeContext({ userId: 'ghost' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when no user on the request (unauthenticated)', async () => {
    const { guard, prisma } = makeGuard({ isSuperAdmin: true });
    await expect(guard.canActivate(makeContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    // Should short-circuit before hitting Prisma.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
