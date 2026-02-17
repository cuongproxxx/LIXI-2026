import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const DRAW_LOCK_TTL_MS = 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_COOKIE = "lixi_admin_session";
export const DRAW_LOCK_COOKIE = "lixi_draw_lock";

function sign(data: string, password: string): string {
  return createHmac("sha256", password).update(data).digest("hex");
}

export function createAdminSession(password: string): string {
  const issuedAt = Date.now().toString();
  const nonce = randomBytes(8).toString("hex");
  const payload = `${issuedAt}.${nonce}`;
  const signature = sign(payload, password);
  return `${payload}.${signature}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyAdminSession(token: string | undefined, password: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAtRaw, nonce, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_TTL_MS) return false;

  const payload = `${issuedAtRaw}.${nonce}`;
  const expected = sign(payload, password);
  return safeEqual(expected, signature);
}

export function getAdminSessionMaxAgeSec(): number {
  return Math.floor(SESSION_TTL_MS / 1000);
}

export function createDrawLockToken(secret: string): string {
  const issuedAt = Date.now().toString();
  const nonce = randomBytes(8).toString("hex");
  const payload = `${issuedAt}.${nonce}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyDrawLockToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [issuedAtRaw, nonce, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > DRAW_LOCK_TTL_MS) return false;

  const payload = `${issuedAtRaw}.${nonce}`;
  const expected = sign(payload, secret);
  return safeEqual(expected, signature);
}

export function getDrawLockMaxAgeSec(): number {
  return Math.floor(DRAW_LOCK_TTL_MS / 1000);
}
