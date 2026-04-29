// Test environment defaults — load before each suite.
process.env.NODE_ENV = 'test';
// Deterministic 32-byte key so crypto.util tests can run without an .env.
process.env.TOKEN_ENCRYPTION_KEY =
  process.env.TOKEN_ENCRYPTION_KEY ||
  '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
