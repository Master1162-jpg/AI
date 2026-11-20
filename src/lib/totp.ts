/**
 * Pure TypeScript RFC 4648 Base32 & RFC 6238 TOTP (HMAC-SHA1) implementation.
 * Compatible with Google Authenticator, Authy, and standard authenticator apps.
 * Works identically in Node.js and browser environments with zero external dependencies.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function leftRotate32(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/**
 * Pure TypeScript SHA-1 (FIPS 180-4) over a Uint8Array, returning a 20-byte digest.
 */
function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length;
  const bitLenHi = Math.floor((ml * 8) / 0x100000000);
  const bitLenLo = (ml * 8) >>> 0;

  const paddedLen = Math.ceil((ml + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(message);
  padded[ml] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      w[i] = leftRotate32(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (leftRotate32(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = leftRotate32(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return out;
}

/**
 * Pure TypeScript HMAC-SHA1 (RFC 2104).
 */
function hmacSha1(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = sha1(k);
  }
  const keyBlock = new Uint8Array(blockSize);
  keyBlock.set(k);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBlock[i] ^ 0x5c;
    iKeyPad[i] = keyBlock[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + data.length);
  inner.set(iKeyPad);
  inner.set(data, blockSize);
  const innerHash = sha1(inner);

  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(oKeyPad);
  outer.set(innerHash, blockSize);
  return sha1(outer);
}

/**
 * Decodes an RFC 4648 Base32 secret string into raw bytes.
 */
export function decodeBase32(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Validates whether a string is a properly formatted Base32 2FA key (minimum 16 chars).
 */
export function isValidBase32Secret(secret: string): boolean {
  const clean = secret.trim().toUpperCase().replace(/\s+/g, '');
  return clean.length >= 16 && /^[A-Z2-7]+$/.test(clean);
}

/**
 * Generates a cryptographically random Base32 2FA secret key (default 16 chars = 80 bits).
 */
export function generateRandomBase32Secret(length = 16): string {
  const randomBytes = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

/**
 * Builds a standard Google Authenticator otpauth:// URI directly from a 2FA secret key.
 */
export function buildOtpAuthUri(
  accountEmail: string,
  secret: string,
  issuer = 'RaidenBO'
): string {
  const cleanSecret = secret.trim().toUpperCase().replace(/[^A-Z2-7]/g, '');
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail.trim())}`;
  const issuerParam = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${issuerParam}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a standard 6-digit RFC 6238 TOTP code for the given Base32 secret and timestamp.
 */
export function generateTotpCode(
  secret: string,
  timeMs = Date.now(),
  stepSeconds = 30,
  digits = 6
): string {
  const key = decodeBase32(secret);
  const counter = Math.floor(timeMs / 1000 / stepSeconds);

  const counterBytes = new Uint8Array(8);
  const view = new DataView(counterBytes.buffer);
  const hi = Math.floor(counter / 0x100000000);
  const lo = counter >>> 0;
  view.setUint32(0, hi, false);
  view.setUint32(4, lo, false);

  const hmac = hmacSha1(key, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return String(binary % mod).padStart(digits, '0');
}

/**
 * Verifies a 6-digit Google Authenticator TOTP code with configurable ±window step drift.
 */
export function verifyTotpCode(
  secret: string,
  inputCode: string,
  timeMs = Date.now(),
  window = 1,
  stepSeconds = 30
): boolean {
  if (!isValidBase32Secret(secret)) return false;
  const cleanCode = inputCode.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  for (let delta = -window; delta <= window; delta++) {
    const checkTime = timeMs + delta * stepSeconds * 1000;
    if (generateTotpCode(secret, checkTime, stepSeconds, 6) === cleanCode) {
      return true;
    }
  }
  return false;
}
