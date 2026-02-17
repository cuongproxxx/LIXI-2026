import type { NextRequest } from "next/server";

function firstForwardedIp(value: string): string {
  return value.split(",")[0].trim();
}

export function getClientIp(request: NextRequest): string {
  const fromForwarded = request.headers.get("x-forwarded-for");
  if (fromForwarded) return firstForwardedIp(fromForwarded);

  const fromRealIp = request.headers.get("x-real-ip");
  if (fromRealIp) return fromRealIp.trim();

  return "unknown";
}
