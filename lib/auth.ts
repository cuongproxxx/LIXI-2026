import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DRAW_LOCK_TTL_MS = 24 * 60 * 60 * 1000;
export const DRAW_LOCK_COOKIE = "lixi_draw_lock";

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
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
