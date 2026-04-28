import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict an endpoint to members of the current tenant holding one of the
 * given roles. Use after @UseGuards(JwtAuthGuard, RolesGuard).
 *
 * Example: @Roles('OWNER', 'ADMIN')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
