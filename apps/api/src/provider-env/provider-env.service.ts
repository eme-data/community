import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../social/crypto.util';

/**
 * Cached, hot-reloadable resolver for provider OAuth credentials.
 *
 * For every key requested (e.g. LINKEDIN_CLIENT_ID), we look it up:
 *   1. in the in-memory cache populated from the ProviderConfig table
 *      (reload() is called on boot and after every admin update),
 *   2. then in process.env (legacy .env-based deployments),
 *   3. finally we throw if both miss.
 *
 * This means an instance with no DB rows behaves exactly like before — the
 * .env continues to work — but operators can override or replace any value
 * from the admin UI without touching the .env or restarting the container.
 */
@Injectable()
export class ProviderEnvService implements OnModuleInit {
  private readonly logger = new Logger(ProviderEnvService.name);
  private cache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.reload();
    } catch (err: any) {
      this.logger.warn(`Initial provider config reload failed: ${err?.message ?? err}`);
    }
  }

  async reload(): Promise<void> {
    const rows = await this.prisma.providerConfig.findMany({ where: { isActive: true } });
    const next = new Map<string, string>();
    for (const row of rows) {
      const values = (row.values ?? {}) as Record<string, string>;
      const enc = new Set(row.encryptedKeys ?? []);
      for (const [k, v] of Object.entries(values)) {
        if (typeof v !== 'string' || !v) continue;
        try {
          next.set(k, enc.has(k) ? decrypt(v) : v);
        } catch (err: any) {
          this.logger.warn(`Failed to decrypt ${k}: ${err?.message ?? err}`);
        }
      }
    }
    this.cache = next;
    this.logger.log(`Provider config cache reloaded (${this.cache.size} keys)`);
  }

  /** Returns the configured value (DB > env), or undefined if unset. */
  getValue(name: string): string | undefined {
    const fromCache = this.cache.get(name);
    if (fromCache) return fromCache;
    const fromEnv = process.env[name];
    return fromEnv && fromEnv.trim() ? fromEnv : undefined;
  }

  /** Like getValue, but throws "Missing env var X" so providers can fail loudly. */
  require(name: string): string {
    const v = this.getValue(name);
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }

  /** Reports configured-or-not status for a list of required keys. */
  isConfigured(keys: string[]): boolean {
    return keys.every((k) => !!this.getValue(k));
  }

  missing(keys: string[]): string[] {
    return keys.filter((k) => !this.getValue(k));
  }
}