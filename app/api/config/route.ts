import { NextResponse } from "next/server";
import { getPublicDeckConfig } from "@/lib/deck-store";

export async function GET() {
  const config = await getPublicDeckConfig();
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
