import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/auth";
import { getDeckState, saveDeckState } from "@/lib/deck-store";
import { getServerEnv } from "@/lib/env-store";
import { getClientIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { adminDeckSchema, deckStateSchema } from "@/lib/validation";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function sumRemaining(deck: Array<{ remaining: number }>): number {
  return deck.reduce((total, item) => total + item.remaining, 0);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Yêu cầu không hợp lệ.", 403);

  const adminPassword = await getServerEnv("ADMIN_PASSWORD");
  if (!adminPassword) return jsonError("ADMIN_PASSWORD chưa được thiết lập.", 412);

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session, adminPassword)) return jsonError("Bạn chưa đăng nhập admin.", 401);

  const ip = getClientIp(request);
  const rate = checkRateLimit(`admin-deck:${ip}`, 30, 5 * 60 * 1000);
  if (!rate.allowed) return jsonError("Bạn đang lưu quá nhanh. Vui lòng thử lại sau.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Dữ liệu gửi lên không hợp lệ.", 400);
  }

  const parsed = adminDeckSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Deck không hợp lệ.", 400);
  }

  const normalized = parsed.data.deck.map((item) => ({
    amount: item.amount,
    quantity: item.quantity,
    remaining: Math.min(item.remaining ?? item.quantity, item.quantity)
  }));

  const validated = deckStateSchema.safeParse({ deck: normalized });
  if (!validated.success) {
    return jsonError(validated.error.issues[0]?.message ?? "Deck chưa đúng định dạng.", 400);
  }

  const saved = await saveDeckState(validated.data);
  return NextResponse.json({
    ok: true,
    deck: saved.deck,
    remainingTotal: sumRemaining(saved.deck)
  });
}

export async function GET(request: NextRequest) {
  const adminPassword = await getServerEnv("ADMIN_PASSWORD");
  if (!adminPassword) return jsonError("ADMIN_PASSWORD chưa được thiết lập.", 412);

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session, adminPassword)) return jsonError("Bạn chưa đăng nhập admin.", 401);

  const state = await getDeckState();
  return NextResponse.json({
    deck: state.deck,
    remainingTotal: sumRemaining(state.deck)
  });
}
