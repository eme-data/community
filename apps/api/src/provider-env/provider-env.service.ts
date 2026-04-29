import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../social/crypto.util';

/**
 * Cached, hot-reloadable resolver for provider OAuth credentials.
 *
 * Lookup priority for every key (e.g. LINKEDIN_CLIENT_ID):
 *   1. tenant cache — TenantProviderConfig row for the requesting tenant,
 *      letting a tenant bring its own OAuth app and stay autonomous,
 *   2. platform cache — ProviderConfig row (configured by the super-admin),
 *   3. process.env — legacy .env-based deployments,
 *   4. throw if all three miss.
 *
 * reload() is called on boot and after every config update (admin or tenant).
 */
@Injectable()
export class ProviderEnvService implements OnModuleInit {
  private readonly logger = new Logger(ProviderEnvService.name);
  private cache = new Map<string, string>();
  private tenantCache = new Map<string, Map<string, string>>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.reload();
    } catch (err: any) {
      this.logger.warn(`Initial provider config reload failed: ${err?.message ?? err}`);
    }
  }

  async reload(): Promise<void> {
    await Promise.all([this.reloadPlatform(), this.reloadAllTenants()]);
  }

  private async reloadPlatform(): Promise<void> {
    const rows = await this.prisma.providerConfig.findMany({ where: { isActive: true } });
    const next = new Map<string, string>();
    for (const row of rows) this.collect(next, row.values, row.encryptedKeys);
    this.cache = next;
    this.logger.log(`Platform provider config cache reloaded (${this.cache.size} keys)`);
  }

  private async reloadAllTenants(): Promise<void> {
    const rows = await this.prisma.tenantProviderConfig.findMany({ where: { isActive: true } });
    const next = new Map<string, Map<string, string>>();
    for (const row of rows) {
      const map = next.get(row.tenantId) ?? new Map<string, string>();
      this.collect(map, row.values, row.encryptedKeys);
      next.set(row.tenantId, map);
    }
    this.tenantCache = next;
    this.logger.log(`Tenant provider config cache reloaded (${this.tenantCache.size} tenants)`);
  }

  /** Refresh a single tenant after they edit their own credentials. */
  async reloadTenant(tenantId: string): Promise<void> {
    const rows = await this.prisma.tenantProviderConfig.findMany({
      where: { tenantId, isActive: true },
    });
    if (rows.length === 0) {
      this.tenantCache.delete(tenantId);
      return;
    }
    const map = new Map<string, string>();
    for (const row of rows) this.collect(map, row.values, row.encryptedKeys);
    this.tenantCache.set(tenantId, map);
  }

  private collect(target: Map<string, string>, values: any, encryptedKeys: string[]) {
    const enc = new Set(encryptedKeys ?? []);
    for (const [k, v] of Object.entries((values ?? {}) as Record<string, string>)) {
      if (typeof v !== 'string' || !v) continue;
      try {
        target.set(k, enc.has(k) ? decrypt(v) : v);
      } catch (err: any) {
        this.logger.warn(`Failed to decrypt ${k}: ${err?.message ?? err}`);
      }
    }
  }

  /**
   * Resolve a single key.
   * - If `tenantId` is provided, the tenant cache is consulted first.
   * - Then the platform cache.
   * - Finally process.env.
   */
  getValue(name: string, tenantId?: string): string | undefined {
    if (tenantId) {
      const fromTenant = this.tenantCache.get(tenantId)?.get(name);
      if (fromTenant) return fromTenant;
    }
    const fromCache = this.cache.get(name);
    if (fromCache) return fromCache;
    const fromEnv = process.env[name];
    return fromEnv && fromEnv.trim() ? fromEnv : undefined;
  }

  /** Like getValue, but throws "Missing env var X" so providers can fail loudly. */
  require(name: string, tenantId?: string): string {
    const v = this.getValue(name, tenantId);
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }

  /** Reports configured-or-not status for a list of required keys. */
  isConfigured(keys: string[], tenantId?: string): boolean {
    return keys.every((k) => !!this.getValue(k, tenantId));
  }

  missing(keys: string[], tenantId?: string): string[] {
    return keys.filter((k) => !this.getValue(k, tenantId));
  }

  /**
   * Did this tenant override at least one key for the given provider?
   * Used by the UI to show "Using my own app" vs "Using platform credentials".
   */
  tenantHasOverride(tenantId: string, keys: string[]): boolean {
    const map = this.tenantCache.get(tenantId);
    if (!map) return false;
    return keys.some((k) => !!map.get(k));
  }
}
