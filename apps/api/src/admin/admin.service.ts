import { Injectable } from '@nestjs/common';
import { SocialProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderEnvService } from '../provider-env/provider-env.service';
import { encrypt } from '../social/crypto.util';

const SECRET_KEY_PATTERNS = [/SECRET/i, /PASSWORD/i];
function isSecretName(name: string): boolean {
  return SECRET_KEY_PATTERNS.some((re) => re.test(name));
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerEnv: ProviderEnvService,
  ) {}

  async listProviderConfigs() {
    const rows = await this.prisma.providerConfig.findMany({});
    return rows.map((r) => this.redact(r));
  }

  async getProviderConfig(provider: SocialProvider) {
    const row = await this.prisma.providerConfig.findUnique({ where: { provider } });
    if (!row) return null;
    return this.redact(row);
  }

  async upsertProviderConfig(
    input: { provider: SocialProvider; values: Record<string, string>; encryptedKeys?: string[] },
    userId: string,
  ) {
    const explicitlyEncrypted = new Set(input.encryptedKeys ?? []);
    const encryptedKeys: string[] = [];
    const storedValues: Record<string, string> = {};

    // Merge with previous values so that omitted secrets keep the existing value
    // (lets the UI display *** placeholders without forcing the user to retype).
    const existing = await this.prisma.providerConfig.findUnique({
      where: { provider: input.provider },
    });
    const existingValues = (existing?.values as Record<string, string>) ?? {};

    for (const [key, rawValue] of Object.entries(input.values ?? {})) {
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      const shouldEncrypt = explicitlyEncrypted.has(key) || isSecretName(key);

      if (!value) {
        // Empty string from the form means "keep existing" if there was one,
        // otherwise drop the key entirely.
        if (existingValues[key]) {
          storedValues[key] = existingValues[key];
          if (existing?.encryptedKeys?.includes(key)) encryptedKeys.push(key);
        }
        continue;
      }

      // Skip the masked placeholder if the UI sends it back unchanged.
      if (value === '***' && existingValues[key]) {
        storedValues[key] = existingValues[key];
        if (existing?.encryptedKeys?.includes(key)) encryptedKeys.push(key);
        continue;
      }

      storedValues[key] = shouldEncrypt ? encrypt(value) : value;
      if (shouldEncrypt) encryptedKeys.push(key);
    }

    const row = await this.prisma.providerConfig.upsert({
      where: { provider: input.provider },
      update: {
        values: storedValues,
        encryptedKeys,
        updatedByUserId: userId,
        isActive: true,
      },
      create: {
        provider: input.provider,
        values: storedValues,
        encryptedKeys,
        updatedByUserId: userId,
        isActive: true,
      },
    });
    await this.providerEnv.reload();
    return this.redact(row);
  }

  async reloadCache() {
    await this.providerEnv.reload();
    return { ok: true };
  }

  /** Mask secrets before sending the row to the UI. */
  private redact(row: { provider: SocialProvider; values: any; encryptedKeys: string[]; isActive: boolean; updatedAt: Date }) {
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