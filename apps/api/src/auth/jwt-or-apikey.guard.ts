import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Authenticates either a JWT (Authorization: Bearer eyJ…) or a tenant API key
 * (Authorization: Bearer apk_…). On success, populates req.user with the
 * standard `{ userId, tenantId }` shape so downstream guards/decorators
 * (RolesGuard, @CurrentUser) keep working unchanged.
 *
 * Apply this guard on endpoints that should be reachable from external
 * integrations (Zapier/n8n/Make/CMS) in addition to the web app.
 */
@Injectable()
export class JwtOrApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: JwtAuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers?.authorization;
    if (auth && auth.startsWith('Bearer apk_')) {
      const rawKey = auth.slice(7);
      const keyHash = createHash('sha256').update(rawKey).digest('hex');
      const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash } });
      if (!apiKey) throw new UnauthorizedException('Invalid API key');
      if (apiKey.revokedAt) throw new UnauthorizedException('API key revoked');
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        throw new UnauthorizedException('API key expired');
      }
      // Best-effort lastUsedAt update; don't block the request.
      this.prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

      req.user = {
        userId: apiKey.createdByUserId,
        tenantId: apiKey.tenantId,
        apiKeyId: apiKey.id,
        scopes: apiKey.scopes,
      };
      return true;
    }
    // Fall back to the JWT guard
    return this.jwtGuard.canActivate(ctx) as Promise<boolean>;
  }
}
