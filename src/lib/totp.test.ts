import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOtpAuthUri,
  decodeBase32,
  generateRandomBase32Secret,
  generateTotpCode,
  isValidBase32Secret,
  verifyTotpCode,
} from './totp';

// RFC 6238 official SHA-1 test seed: ASCII "12345678901234567890"
const RFC_6238_BASE32_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('generateRandomBase32Secret produces valid 16-char unique Base32 keys', () => {
  const keyA = generateRandomBase32Secret(16);
  const keyB = generateRandomBase32Secret(16);
  assert.equal(keyA.length, 16);
  assert.equal(keyB.length, 16);
  assert.equal(isValidBase32Secret(keyA), true);
  assert.equal(isValidBase32Secret(keyB), true);
  assert.notEqual(keyA, keyB);
});

test('decodeBase32 accurately decodes RFC 4648 Base32 secret', () => {
  const bytes = decodeBase32(RFC_6238_BASE32_SECRET);
  const ascii = Buffer.from(bytes).toString('ascii');
  assert.equal(ascii, '12345678901234567890');
});

test('generateTotpCode matches official RFC 6238 SHA-1 test vectors', () => {
  // Official 8-digit vectors truncated to last 6 digits:
  // T=59 -> 94287082 -> 287082
  assert.equal(generateTotpCode(RFC_6238_BASE32_SECRET, 59 * 1000), '287082');
  // T=1111111109 -> 07081804 -> 081804
  assert.equal(generateTotpCode(RFC_6238_BASE32_SECRET, 1111111109 * 1000), '081804');
  // T=1234567890 -> 89005924 -> 005924
  assert.equal(generateTotpCode(RFC_6238_BASE32_SECRET, 1234567890 * 1000), '005924');
});

test('verifyTotpCode accepts current and +-1 step drift and rejects invalid codes', () => {
  const secret = generateRandomBase32Secret(16);
  const now = 1_760_000_015_000;
  const currentCode = generateTotpCode(secret, now);
  const prevStepCode = generateTotpCode(secret, now - 30_000);
  const nextStepCode = generateTotpCode(secret, now + 30_000);
  const expiredCode = generateTotpCode(secret, now - 90_000);

  assert.equal(verifyTotpCode(secret, currentCode, now, 1), true);
  assert.equal(verifyTotpCode(secret, prevStepCode, now, 1), true);
  assert.equal(verifyTotpCode(secret, nextStepCode, now, 1), true);
  assert.equal(verifyTotpCode(secret, expiredCode, now, 1), false);
  assert.equal(verifyTotpCode(secret, '00000', now, 1), false);
  assert.equal(verifyTotpCode(secret, 'abcdef', now, 1), false);
});

test('buildOtpAuthUri produces Google Authenticator compatible otpauth URI', () => {
  const uri = buildOtpAuthUri('trader@raidenbo.io', 'FNJWCLJOIEEUQORZ', 'RaidenBO');
  assert.equal(
    uri,
    'otpauth://totp/RaidenBO:trader%40raidenbo.io?secret=FNJWCLJOIEEUQORZ&issuer=RaidenBO&algorithm=SHA1&digits=6&period=30'
  );
  const defaultIssuerUri = buildOtpAuthUri('trader@raidenbo.io', 'FNJWCLJOIEEUQORZ');
  assert.equal(defaultIssuerUri, uri);
});
