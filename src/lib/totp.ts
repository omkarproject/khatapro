/**
 * TOTP (Time-based One-Time Password) Algorithm - RFC 6238 / RFC 4226
 * Pure JavaScript HMAC-SHA1 implementation with zero external dependencies.
 * Works synchronously and seamlessly in both browser and server environments.
 */

// Base32 Decoder (RFC 4648)
export function base32Decode(raw: string): Uint8Array {
  if (!raw) return new Uint8Array(0);
  const clean = raw
    .toUpperCase()
    .replace(/[\s\-_=]/g, '')
    .trim();
  
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((clean.length * 5) / 8));

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue; // ignore non-base32 chars
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  const finalOut = new Uint8Array(index);
  finalOut.set(output.subarray(0, index));
  return finalOut;
}

// Pure JS SHA-1 Hash
function sha1(message: Uint8Array): Uint8Array {
  function rotl(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }

  let H0 = 0x67452301;
  let H1 = 0xefcdab89;
  let H2 = 0x98badcfe;
  let H3 = 0x10325476;
  let H4 = 0xc3d2e1f0;

  const msgLen = message.length;
  const words: number[] = [];

  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] |= (message[i] & 0xff) << (24 - (i % 4) * 8);
  }
  words[msgLen >> 2] |= 0x80 << (24 - (msgLen % 4) * 8);

  const totalWords = (((msgLen + 8) >> 6) + 1) * 16;
  while (words.length < totalWords) words.push(0);
  words[totalWords - 1] = (msgLen * 8) & 0xffffffff;
  words[totalWords - 2] = Math.floor((msgLen * 8) / 0x100000000);

  const W = new Int32Array(80);
  for (let i = 0; i < totalWords; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t];
    for (let t = 16; t < 80; t++) {
      W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    let A = H0;
    let B = H1;
    let C = H2;
    let D = H3;
    let E = H4;

    for (let t = 0; t < 80; t++) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (B & C) | (~B & D);
        k = 0x5a827999;
      } else if (t < 40) {
        f = B ^ C ^ D;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (B & C) | (B & D) | (C & D);
        k = 0x8f1bbcdc;
      } else {
        f = B ^ C ^ D;
        k = 0xca62c1d6;
      }

      const temp = (rotl(A, 5) + f + E + k + W[t]) | 0;
      E = D;
      D = C;
      C = rotl(B, 30);
      B = A;
      A = temp;
    }

    H0 = (H0 + A) | 0;
    H1 = (H1 + B) | 0;
    H2 = (H2 + C) | 0;
    H3 = (H3 + D) | 0;
    H4 = (H4 + E) | 0;
  }

  const result = new Uint8Array(20);
  const hs = [H0, H1, H2, H3, H4];
  for (let i = 0; i < 5; i++) {
    result[i * 4] = (hs[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (hs[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (hs[i] >>> 8) & 0xff;
    result[i * 4 + 3] = hs[i] & 0xff;
  }
  return result;
}

// Pure JS HMAC-SHA1
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k: Uint8Array = key;
  if (k.length > blockSize) {
    k = sha1(k);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(k);

  const oPad = new Uint8Array(blockSize);
  const iPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oPad[i] = paddedKey[i] ^ 0x5c;
    iPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + message.length);
  innerMsg.set(iPad);
  innerMsg.set(message, blockSize);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(blockSize + 20);
  outerMsg.set(oPad);
  outerMsg.set(innerHash, blockSize);
  return sha1(outerMsg);
}

/**
 * Generate a 6-digit TOTP token from a Base32 secret
 */
export function generateTotpToken(
  secretBase32: string,
  timeSec: number = Math.floor(Date.now() / 1000),
  period: number = 30,
  digits: number = 6
): string {
  try {
    const key = base32Decode(secretBase32);
    if (key.length === 0) return '------';

    const counter = Math.floor(timeSec / period);
    const msg = new Uint8Array(8);
    let c = counter;
    for (let i = 7; i >= 0; i--) {
      msg[i] = c & 0xff;
      c = Math.floor(c / 256);
    }

    const hmac = hmacSha1(key, msg);
    const offset = hmac[19] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const token = (code % Math.pow(10, digits)).toString().padStart(digits, '0');
    return token;
  } catch (err) {
    console.error('TOTP generation error:', err);
    return '------';
  }
}

/**
 * Parse an otpauth://totp/ URI or raw secret string
 */
export function parseOtpAuthUri(input: string): {
  secret: string;
  issuer?: string;
  accountName?: string;
  period?: number;
  digits?: number;
} {
  const trimmed = input.trim();
  if (trimmed.startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      const secret = url.searchParams.get('secret') || '';
      let issuer = url.searchParams.get('issuer') || '';
      const period = parseInt(url.searchParams.get('period') || '30', 10);
      const digits = parseInt(url.searchParams.get('digits') || '6', 10);

      // Label can be "Issuer:Account" or just "Account"
      let label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//i, '').replace(/^\/totp\//i, ''));
      let accountName = label;
      if (label.includes(':')) {
        const parts = label.split(':');
        if (!issuer) issuer = parts[0].trim();
        accountName = parts.slice(1).join(':').trim();
      }

      return {
        secret: secret.toUpperCase().replace(/\s+/g, ''),
        issuer: issuer.trim(),
        accountName: accountName.trim(),
        period: isNaN(period) ? 30 : period,
        digits: isNaN(digits) ? 6 : digits,
      };
    } catch {
      // Fallback if URL parsing fails
    }
  }

  // Treat as raw secret key
  return {
    secret: trimmed.toUpperCase().replace(/\s+/g, ''),
  };
}

/**
 * Get remaining seconds and progress percentage in the current 30s window
 */
export function getTotpTimeRemaining(period: number = 30): {
  remaining: number;
  percent: number;
  epoch: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const remaining = period - (now % period);
  const percent = (remaining / period) * 100;
  const epoch = Math.floor(now / period);
  return { remaining, percent, epoch };
}

/**
 * Format 6-digit code with spacing: "123 456"
 */
export function formatTotpCode(code: string): string {
  if (!code || code.length !== 6) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Verify a user-provided 6-digit TOTP token against a Base32 secret.
 * Allows a clock-skew window of ±1 step (±30s) by default.
 */
export function verifyTotpToken(
  secretBase32: string,
  userToken: string,
  windowSteps: number = 1,
  period: number = 30,
  digits: number = 6
): boolean {
  if (!secretBase32 || !userToken) return false;
  const cleanToken = userToken.replace(/\s+/g, '').trim();
  if (cleanToken.length !== digits) return false;

  const currentSec = Math.floor(Date.now() / 1000);
  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const t = currentSec + (offset * period);
    const expected = generateTotpToken(secretBase32, t, period, digits);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a cryptographically random Base32 secret (16-32 characters).
 */
export function generateBase32Secret(length: number = 16): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return secret;
}

/**
 * Builds an otpauth://totp/ standard URI for QR code generation.
 */
export function buildOtpAuthUri(
  secret: string,
  accountEmail: string,
  issuer: string = 'SmartKhata'
): string {
  const encIssuer = encodeURIComponent(issuer);
  const encAccount = encodeURIComponent(accountEmail || 'Merchant');
  const cleanSecret = secret.toUpperCase().replace(/\s+/g, '');
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${cleanSecret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

