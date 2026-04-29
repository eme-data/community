import { encrypt, decrypt } from './crypto.util';

describe('crypto.util', () => {
  it('roundtrips a value through encrypt + decrypt', () => {
    const plain = 'super-secret-token-1234567890';
    const cipher = encrypt(plain);
    expect(cipher).not.toEqual(plain);
    expect(cipher.split('.').length).toBe(3); // iv.tag.data
    expect(decrypt(cipher)).toEqual(plain);
  });

  it('produces a different ciphertext each call (random IV)', () => {
    const plain = 'same-input';
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toEqual(b);
    expect(decrypt(a)).toEqual(plain);
    expect(decrypt(b)).toEqual(plain);
  });

  it('rejects a tampered payload (auth tag mismatch)', () => {
    const cipher = encrypt('value');
    const [iv, tag, data] = cipher.split('.');
    // Flip a byte in the encrypted data — auth tag should fail.
    const flipped = Buffer.from(data, 'base64');
    flipped[0] = flipped[0] ^ 0x01;
    const tampered = [iv, tag, flipped.toString('base64')].join('.');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on malformed payload (missing parts)', () => {
    expect(() => decrypt('not-a-valid-payload')).toThrow(/Invalid encrypted payload/);
  });

  it('throws when TOKEN_ENCRYPTION_KEY is missing or wrong length', () => {
    const original = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = 'tooshort';
    try {
      expect(() => encrypt('x')).toThrow(/64 hex chars/);
    } finally {
      process.env.TOKEN_ENCRYPTION_KEY = original;
    }
  });
});
