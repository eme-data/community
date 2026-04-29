import { ProviderEnvService } from './provider-env.service';
import { encrypt } from '../social/crypto.util';

describe('ProviderEnvService', () => {
  function makeService(rows: any[], tenantRows: any[] = []) {
    const prisma = {
      providerConfig: { findMany: jest.fn().mockResolvedValue(rows) },
      tenantProviderConfig: { findMany: jest.fn().mockResolvedValue(tenantRows) },
    } as any;
    return new ProviderEnvService(prisma);
  }

  it('returns a plain DB value', async () => {
    const svc = makeService([
      { values: { LINKEDIN_CLIENT_ID: 'abc' }, encryptedKeys: [], isActive: true },
    ]);
    await svc.reload();
    expect(svc.getValue('LINKEDIN_CLIENT_ID')).toEqual('abc');
  });

  it('decrypts encrypted values', async () => {
    const cipher = encrypt('linkedin-secret');
    const svc = makeService([
      {
        values: { LINKEDIN_CLIENT_SECRET: cipher },
        encryptedKeys: ['LINKEDIN_CLIENT_SECRET'],
        isActive: true,
      },
    ]);
    await svc.reload();
    expect(svc.getValue('LINKEDIN_CLIENT_SECRET')).toEqual('linkedin-secret');
  });

  it('falls back to process.env when DB has no value', async () => {
    const svc = makeService([]);
    await svc.reload();
    process.env.SOME_TEST_VAR = 'env-value';
    try {
      expect(svc.getValue('SOME_TEST_VAR')).toEqual('env-value');
    } finally {
      delete process.env.SOME_TEST_VAR;
    }
  });

  it('DB takes precedence over env when both are set', async () => {
    const svc = makeService([
      { values: { OVERLAP_KEY: 'from-db' }, encryptedKeys: [], isActive: true },
    ]);
    process.env.OVERLAP_KEY = 'from-env';
    try {
      await svc.reload();
      expect(svc.getValue('OVERLAP_KEY')).toEqual('from-db');
    } finally {
      delete process.env.OVERLAP_KEY;
    }
  });

  it('require() throws on missing key', async () => {
    const svc = makeService([]);
    await svc.reload();
    expect(() => svc.require('NOT_SET')).toThrow(/Missing env var NOT_SET/);
  });

  it('isConfigured / missing report correctly', async () => {
    const svc = makeService([
      { values: { A: '1' }, encryptedKeys: [], isActive: true },
    ]);
    await svc.reload();
    expect(svc.isConfigured(['A'])).toBe(true);
    expect(svc.isConfigured(['A', 'B'])).toBe(false);
    expect(svc.missing(['A', 'B', 'C'])).toEqual(['B', 'C']);
  });

  it('skips a value that fails to decrypt without throwing', async () => {
    const svc = makeService([
      {
        values: { BROKEN: 'not.a.valid.cipher' },
        encryptedKeys: ['BROKEN'],
        isActive: true,
      },
    ]);
    await expect(svc.reload()).resolves.toBeUndefined();
    expect(svc.getValue('BROKEN')).toBeUndefined();
  });

  describe('tenant overrides', () => {
    it('tenant value takes precedence over platform value', async () => {
      const svc = makeService(
        [{ values: { LINKEDIN_CLIENT_ID: 'platform' }, encryptedKeys: [], isActive: true }],
        [
          {
            tenantId: 't1',
            values: { LINKEDIN_CLIENT_ID: 'tenant-1' },
            encryptedKeys: [],
            isActive: true,
          },
        ],
      );
      await svc.reload();
      expect(svc.getValue('LINKEDIN_CLIENT_ID', 't1')).toEqual('tenant-1');
      // Without tenantId, platform wins.
      expect(svc.getValue('LINKEDIN_CLIENT_ID')).toEqual('platform');
      // Different tenant without override falls back to platform.
      expect(svc.getValue('LINKEDIN_CLIENT_ID', 't2')).toEqual('platform');
    });

    it('tenant override falls back to platform/env when key is missing', async () => {
      const svc = makeService(
        [{ values: { SHARED: 'platform' }, encryptedKeys: [], isActive: true }],
        [
          {
            tenantId: 't1',
            values: { LINKEDIN_CLIENT_ID: 'tenant-only' },
            encryptedKeys: [],
            isActive: true,
          },
        ],
      );
      await svc.reload();
      // SHARED is only set at platform level — tenant lookup falls through.
      expect(svc.getValue('SHARED', 't1')).toEqual('platform');
    });

    it('tenantHasOverride detects a per-tenant override', async () => {
      const svc = makeService(
        [{ values: { LINKEDIN_CLIENT_ID: 'platform' }, encryptedKeys: [], isActive: true }],
        [
          {
            tenantId: 't1',
            values: { LINKEDIN_CLIENT_ID: 'tenant', LINKEDIN_CLIENT_SECRET: 'tenant-secret' },
            encryptedKeys: [],
            isActive: true,
          },
        ],
      );
      await svc.reload();
      expect(svc.tenantHasOverride('t1', ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'])).toBe(true);
      expect(svc.tenantHasOverride('t2', ['LINKEDIN_CLIENT_ID'])).toBe(false);
    });

    it('reloadTenant evicts the cache entry when no rows remain', async () => {
      const prisma = {
        providerConfig: { findMany: jest.fn().mockResolvedValue([]) },
        tenantProviderConfig: {
          findMany: jest
            .fn()
            // Initial load: t1 has an override.
            .mockResolvedValueOnce([
              { tenantId: 't1', values: { K: 'v' }, encryptedKeys: [], isActive: true },
            ])
            // reloadTenant call: tenant deleted their override.
            .mockResolvedValueOnce([]),
        },
      } as any;
      const svc = new ProviderEnvService(prisma);
      await svc.reload();
      expect(svc.getValue('K', 't1')).toEqual('v');
      await svc.reloadTenant('t1');
      expect(svc.getValue('K', 't1')).toBeUndefined();
    });
  });
});
