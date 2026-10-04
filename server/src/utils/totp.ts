/**
 * TOTP (RFC 6238) built on Node's crypto HMAC, plus helpers for storing the secret safely
 * and for one-time recovery codes. Verified against the RFC 6238 test vectors.
 */
import crypto from 'crypto';
import { env } from '../config/env';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_STEP_SECONDS = 30;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=]+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160-bit random secret, base32 encoded (the format authenticator apps expect). */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', secret).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Checks a 6-digit code, allowing one step of clock drift either way.
 * Returns the matching time step, or null. Steps <= lastUsedStep are refused so a code cannot be replayed.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  nowMs = Date.now(),
  lastUsedStep?: number | null,
  window = 1
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const current = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  let matched: number | null = null;
  for (let w = -window; w <= window; w++) {
    const step = current + w;
    const ok = safeEqual(hotp(secret, step), code); // evaluate every window: no early exit
    if (ok && (lastUsedStep === undefined || lastUsedStep === null || step > lastUsedStep)) matched = step;
  }
  return matched;
}

export function otpauthUrl(email: string, secret: string, issuer = 'OrbitPM'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${TOTP_STEP_SECONDS}`;
}

// ---------- secret encryption at rest (AES-256-GCM) ----------

let warned = false;
function encryptionKey(): Buffer {
  if (env.twoFactorEncryptionKey) {
    const key = Buffer.from(env.twoFactorEncryptionKey, 'hex');
    if (key.length !== 32) throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    return key;
  }
  if (env.nodeEnv === 'production' && !warned) {
    warned = true;
    console.warn(
      '[2fa] TWO_FACTOR_ENCRYPTION_KEY is not set: deriving the key from JWT_REFRESH_SECRET. ' +
        'Set a dedicated key, otherwise rotating the JWT secret will lock users out of 2FA.'
    );
  }
  return crypto.createHash('sha256').update(`orbitpm-2fa-v1:${env.jwtRefreshSecret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), ct.toString('hex')].join(':');
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ct] = payload.split(':');
  if (version !== 'v1' || !iv || !tag || !ct) throw new Error('Unsupported secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'hex')), decipher.final()]).toString('utf8');
}

// ---------- recovery codes ----------

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from({ length: 10 }, () => RECOVERY_ALPHABET[crypto.randomInt(RECOVERY_ALPHABET.length)]);
    return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
  });
}

export const normalizeRecoveryCode = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, '');

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex');
}

export function matchRecoveryHash(hashes: string[], code: string): string | undefined {
  const candidate = hashRecoveryCode(code);
  return hashes.find((h) => safeEqual(h, candidate));
}
