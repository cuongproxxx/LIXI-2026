import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/auth";
import { getDeckState } from "@/lib/deck-store";
import { getServerEnv } from "@/lib/env-store";

function sumRemaining(deck: Array<{ remaining: number }>): number {
  return deck.reduce((total, item) => total + item.remaining, 0);
}

export async function GET(request: NextRequest) {
  const adminPassword = await getServerEnv("ADMIN_PASSWORD");
  if (!adminPassword) {
    return NextResponse.json({
      requiresSetup: true,
      authenticated: false
    });
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = verifyAdminSession(session, adminPassword);
  if (!authenticated) {
    return NextResponse.json({
      requiresSetup: false,
      authenticated: false
    });
  }

  const deckState = await getDeckState();

  return NextResponse.json({
    requiresSetup: false,
    authenticated: true,
    deck: deckState.deck,
    remainingTotal: sumRemaining(deckState.deck)
  });
}
