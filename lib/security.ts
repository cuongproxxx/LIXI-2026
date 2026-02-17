import type { NextRequest } from "next/server";

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  const fallbackProtocol = request.nextUrl.protocol.replace(":", "");
  const protocol = request.headers.get("x-forwarded-proto") ?? fallbackProtocol;
  return origin === `${protocol}://${host}`;
}

export function sanitizePlainText(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function shortenUserAgent(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Không rõ";
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}...` : trimmed;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
