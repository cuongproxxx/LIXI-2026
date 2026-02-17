import { NextRequest, NextResponse } from "next/server";
import { addMoneyToDeck } from "@/lib/deck-store";
import { getClientIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { depositSchema } from "@/lib/validation";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Yeu cau khong hop le.", 403);

  const ip = getClientIp(request);
  const rate = checkRateLimit(`deposit:${ip}`, 30, 5 * 60 * 1000);
  if (!rate.allowed) return jsonError("Ban thao tac qua nhanh. Vui long thu lai sau.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Du lieu gui len khong hop le.", 400);
  }

  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Thong tin bo tien khong hop le.", 400);
  }

  try {
    const updated = await addMoneyToDeck(parsed.data.amount, parsed.data.quantity);
    return NextResponse.json({
      ok: true,
      added: parsed.data,
      remainingTotal: updated.remainingTotal,
      deck: updated.deck.map((item) => ({ amount: item.amount, remaining: item.remaining }))
    });
  } catch (error) {
    if (error instanceof Error && error.message) {
      return jsonError(error.message, 400);
    }
    return jsonError("Khong the cap nhat bao li xi luc nay.", 500);
  }
}
