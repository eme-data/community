import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      // Never return keyHash to clients
      select: {
        id: true,
        name: true,
        preview: true,
        scopes: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        createdAt: true,
        createdByUserId: true,
      },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    data: { name: string; scopes?: string[]; expiresAt?: Date | null },
  ) {
    // Raw key shape: apk_<32 random hex chars> — high entropy, unguessable.
    const rawKey = `apk_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const preview = rawKey.slice(0, 8); // "apk_xxxx"

    const created = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: data.name,
        keyHash,
        preview,
        scopes: data.scopes ?? ['read', 'write'],
        createdByUserId: userId,
        expiresAt: data.expiresAt ?? null,
      },
      select: {
        id: true,
        name: true,
        preview: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'api_key.created',
      target: created.id,
      payload: { name: data.name, scopes: created.scopes },
    });

    // The raw key is returned ONLY here, never again.
    return { ...created, rawKey };
  }

  async revoke(tenantId: string, userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');
    if (key.revokedAt) return { ok: true };

    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      tenantId,
      userId,
      action: 'api_key.revoked',
      target: id,
      payload: { name: key.name },
    });
    return { ok: true };
  }
}
