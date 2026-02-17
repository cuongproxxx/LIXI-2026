import { NextRequest, NextResponse } from "next/server";
import {
  createDrawLockToken,
  DRAW_LOCK_COOKIE,
  getDrawLockMaxAgeSec,
  verifyDrawLockToken
} from "@/lib/auth";
import { drawFromDeck } from "@/lib/deck-store";
import { getServerEnv } from "@/lib/env-store";
import { getClientIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

const DRAW_LIMIT = 10;
const DRAW_WINDOW_MS = 60 * 1000;
const DRAW_COOKIE_FALLBACK_SECRET = "lixi-2026-draw-lock";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Yeu cau khong hop le.", 403);

  const ip = getClientIp(request);
  const rate = checkRateLimit(`draw:${ip}`, DRAW_LIMIT, DRAW_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Ban thao tac qua nhanh, vui long thu lai sau." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
    );
  }

  let continueMode = false;
  try {
    const body = (await request.json()) as { continue?: boolean };
    continueMode = body.continue === true;
  } catch {
    continueMode = false;
  }

  const signingSecret = (await getServerEnv("ADMIN_PASSWORD")) || DRAW_COOKIE_FALLBACK_SECRET;
  if (!continueMode) {
    const lockCookie = request.cookies.get(DRAW_LOCK_COOKIE)?.value;
    if (verifyDrawLockToken(lockCookie, signingSecret)) {
      return jsonError("Ban da rut li xi trong 24h qua.", 429);
    }
  }

  const draw = await drawFromDeck();
  if (draw.exhausted || typeof draw.amount === "undefined") {
    return NextResponse.json(
      { exhausted: true, remainingTotal: 0, error: "Het li xi roi, quay lai sau nhe." },
      { status: 409 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    amount: draw.amount,
    remainingTotal: draw.remainingTotal
  });

  if (!continueMode) {
    response.cookies.set({
      name: DRAW_LOCK_COOKIE,
      value: createDrawLockToken(signingSecret),
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: getDrawLockMaxAgeSec()
    });
  }

  return response;
}
