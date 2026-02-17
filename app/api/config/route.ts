import { NextResponse } from "next/server";
import { getCurrencyNoteAssets } from "@/lib/currency-notes";
import { getPublicDeckConfig } from "@/lib/deck-store";

export async function GET() {
  const [config, currencyNotes] = await Promise.all([getPublicDeckConfig(), getCurrencyNoteAssets()]);
  return NextResponse.json({ ...config, currencyNotes }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
