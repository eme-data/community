import { ProviderEnvService } from './provider-env.service';
import { encrypt } from '../social/crypto.util';

describe('ProviderEnvService', () => {
  function makeService(rows: any[]) {
    const prisma = {
      providerConfig: { findMany: jest.fn().mockResolvedValue(rows) },
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
});
