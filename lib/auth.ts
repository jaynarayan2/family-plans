// PIN auth helpers — uses Web Crypto so it works in both the Node API routes
// and the Edge middleware. PINs are salted-hashed; the session is an HMAC-signed
// cookie so a random link visitor can't reach the data API.

export const SESSION_COOKIE = 'fam_session';
const enc = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET || 'family-plans-insecure-dev-secret-please-set-AUTH_SECRET';
}

export function familyResetCode(): string | null {
  const c = process.env.FAMILY_RESET_CODE;
  return c && c.length > 0 ? c : null;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(msg: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(msg));
  return toHex(d);
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function validPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// Stored form: "<salt>:<hash>"
export async function hashPin(pin: string): Promise<string> {
  const salt = randomHex(12);
  const hash = await sha256Hex(`${salt}:${pin}`);
  return `${salt}:${hash}`;
}

export async function verifyPin(pin: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = await sha256Hex(`${salt}:${pin}`);
  return timingSafeEqual(check, hash);
}

async function hmacHex(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return toHex(sig);
}

// Session token: "<user>.<hmac(user)>"
export async function signSession(user: string): Promise<string> {
  const sig = await hmacHex(user);
  return `${user}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const user = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = await hmacHex(user);
  return timingSafeEqual(sig, expected) ? user : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
