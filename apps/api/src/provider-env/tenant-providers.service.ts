import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderEnvService } from './provider-env.service';
import { encrypt } from '../social/crypto.util';

const SECRET_KEY_PATTERNS = [/SECRET/i, /PASSWORD/i];
function isSecretName(name: string): boolean {
  return SECRET_KEY_PATTERNS.some((re) => re.test(name));
}

interface UpsertInput {
  provider: SocialProvider;
  values: Record<string, string>;
  encryptedKeys?: string[];
}

/**
 * Tenant-scoped sibling of AdminService — lets a tenant OWNER/ADMIN bring
 * their own OAuth app credentials. Same encryption/redaction rules apply.
 * After every write we ask ProviderEnvService to refresh that tenant's cache.
 */
@Injectable()
export class TenantProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: ProviderEnvService,
  ) {}

  async list(tenantId: string) {
    const rows = await this.prisma.tenantProviderConfig.findMany({ where: { tenantId } });
    return rows.map((r) => this.redact(r));
  }

  async get(tenantId: string, provider: SocialProvider) {
    const row = await this.prisma.tenantProviderConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });
    if (!row) return null;
    return this.redact(row);
  }

  async upsert(tenantId: string, input: UpsertInput, userId: string) {
    const explicitlyEncrypted = new Set(input.encryptedKeys ?? []);
    const encryptedKeys: string[] = [];
    const storedValues: Record<string, string> = {};

    const existing = await this.prisma.tenantProviderConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider: input.provider } },
    });
    const existingValues = (existing?.values as Record<string, string>) ?? {};

    for (const [key, rawValue] of Object.entries(input.values ?? {})) {
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      const shouldEncrypt = explicitlyEncrypted.has(key) || isSecretName(key);

      if (!value) {
        if (existingValues[key]) {
          storedValues[key] = existingValues[key];
          if (existing?.encryptedKeys?.includes(key)) encryptedKeys.push(key);
        }
        continue;
      }
      // The masked placeholder means "keep what we already have".
      if (value === '***' && existingValues[key]) {
        storedValues[key] = existingValues[key];
        if (existing?.encryptedKeys?.includes(key)) encryptedKeys.push(key);
        continue;
      }

      storedValues[key] = shouldEncrypt ? encrypt(value) : value;
      if (shouldEncrypt) encryptedKeys.push(key);
    }

    const row = await this.prisma.tenantProviderConfig.upsert({
      where: { tenantId_provider: { tenantId, provider: input.provider } },
      update: {
        values: storedValues,
        encryptedKeys,
        updatedByUserId: userId,
        isActive: true,
      },
      create: {
        tenantId,
        provider: input.provider,
        values: storedValues,
        encryptedKeys,
        updatedByUserId: userId,
        isActive: true,
      },
    });
    await this.env.reloadTenant(tenantId);
    return this.redact(row);
  }

  async reset(tenantId: string, provider: SocialProvider) {
    const row = await this.prisma.tenantProviderConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });
    if (!row) throw new NotFoundException('No tenant override exists for this provider');
    await this.prisma.tenantProviderConfig.delete({
      where: { tenantId_provider: { tenantId, provider } },
    });
    await this.env.reloadTenant(tenantId);
    return { ok: true };
  }

  private redact(row: {
    provider: SocialProvider;
    values: any;
    encryptedKeys: string[];
    isActive: boolean;
    updatedAt: Date;
  }) {
    const values = (row.values ?? {}) as Record<string, string>;
    const enc = new Set(row.encryptedKeys ?? []);
    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (!v) continue;
      masked[k] = enc.has(k) || isSecretName(k) ? '***' : v;
    }
    return {
      provider: row.provider,
      values: masked,
      encryptedKeys: row.encryptedKeys,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    };
  }
}
