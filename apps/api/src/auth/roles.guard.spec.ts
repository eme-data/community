import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function makeContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function makeGuard(opts: {
    requiredRoles?: string[];
    membershipRole?: string | null;
  }) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(opts.requiredRoles),
    } as unknown as Reflector;
    const prisma = {
      membership: {
        findUnique: jest.fn().mockResolvedValue(
          opts.membershipRole !== undefined && opts.membershipRole !== null
            ? { role: opts.membershipRole }
            : null,
        ),
      },
    } as any;
    return { guard: new RolesGuard(reflector, prisma), prisma };
  }

  it('allows when no roles are required (no decorator)', async () => {
    const { guard } = makeGuard({ requiredRoles: undefined });
    await expect(guard.canActivate(makeContext({ userId: 'u', tenantId: 't' }))).resolves.toBe(true);
  });

  it('allows when membership role is in the required list', async () => {
    const { guard } = makeGuard({ requiredRoles: ['OWNER', 'ADMIN'], membershipRole: 'ADMIN' });
    await expect(guard.canActivate(makeContext({ userId: 'u', tenantId: 't' }))).resolves.toBe(true);
  });

  it('denies when membership role is not in the required list', async () => {
    const { guard } = makeGuard({ requiredRoles: ['OWNER'], membershipRole: 'EDITOR' });
    await expect(guard.canActivate(makeContext({ userId: 'u', tenantId: 't' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies when no membership exists', async () => {
    const { guard } = makeGuard({ requiredRoles: ['OWNER'], membershipRole: null });
    await expect(guard.canActivate(makeContext({ userId: 'u', tenantId: 't' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies unauthenticated requests when roles are required', async () => {
    const { guard, prisma } = makeGuard({ requiredRoles: ['OWNER'], membershipRole: 'OWNER' });
    await expect(guard.canActivate(makeContext(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });
});
