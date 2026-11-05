// Tiny JWT helpers used by the mock backend (signing) and the app (reading `exp`).
// NOTE: the signature below is a simple hash, NOT real cryptography. It only exists so the
// mock token has the same shape as a real JWT (header.payload.signature).

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const MOCK_SECRET = 'hously-mock-secret';

export function base64Encode(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i);
    const b = i + 1 < input.length ? input.charCodeAt(i + 1) : NaN;
    const c = i + 2 < input.length ? input.charCodeAt(i + 2) : NaN;
    out += CHARS[a >> 2];
    out += CHARS[((a & 3) << 4) | ((Number.isNaN(b) ? 0 : b) >> 4)];
    out += Number.isNaN(b) ? '=' : CHARS[((b & 15) << 2) | ((Number.isNaN(c) ? 0 : c) >> 6)];
    out += Number.isNaN(c) ? '=' : CHARS[c & 63];
  }
  return out;
}

export function base64Decode(input: string): string {
  const clean = input.replace(/=+$/, '');
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const idx = CHARS.indexOf(ch);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

const toUrl = (b64: string) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromUrl = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/');

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export function signToken(userId: string, ttlSeconds = 60 * 60 * 24 * 7): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toUrl(base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = toUrl(base64Encode(JSON.stringify({ sub: userId, iat: now, exp: now + ttlSeconds })));
  const signature = toUrl(base64Encode(hash(`${header}.${payload}.${MOCK_SECRET}`)));
  return `${header}.${payload}.${signature}`;
}

/** Decodes the payload without verifying the signature (client-side use). */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64Decode(fromUrl(parts[1]))) as JwtPayload;
  } catch {
    return null;
  }
}

/** Verifies signature + expiry (mock server use). Returns the payload or null. */
export function verifyToken(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = toUrl(base64Encode(hash(`${parts[0]}.${parts[1]}.${MOCK_SECRET}`)));
  if (expected !== parts[2]) return null;
  const payload = decodeToken(token);
  if (!payload || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  return !payload || payload.exp * 1000 < Date.now();
}
