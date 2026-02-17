import { promises as fs } from "node:fs";
import path from "node:path";

export interface CurrencyNoteAsset {
  amount: number;
  src: string;
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const CURRENCY_DIR_CANDIDATES = [path.join(process.cwd(), "public", "currency"), path.join(process.cwd(), "currency")];

function parseAmountFromFileName(fileName: string): number | null {
  const stem = fileName.replace(/\.[^.]+$/, "").toLowerCase().trim();
  const compact = stem.replace(/[_\s-]+/g, "");
  const match = compact.match(/(\d+(?:\.\d+)?)(k|m)?/);
  if (!match) return null;

  const base = Number(match[1]);
  if (!Number.isFinite(base) || base <= 0) return null;

  if (match[2] === "k") return Math.round(base * 1_000);
  if (match[2] === "m") return Math.round(base * 1_000_000);
  return Math.round(base);
}

async function readCurrencyFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase()));
  } catch {
    return [];
  }
}

export async function getCurrencyNoteAssets(): Promise<CurrencyNoteAsset[]> {
  for (const dirPath of CURRENCY_DIR_CANDIDATES) {
    const fileNames = await readCurrencyFiles(dirPath);
    if (fileNames.length === 0) continue;

    const uniqueByAmount = new Map<number, CurrencyNoteAsset>();
    for (const fileName of fileNames.sort()) {
      const amount = parseAmountFromFileName(fileName);
      if (!amount || uniqueByAmount.has(amount)) continue;
      uniqueByAmount.set(amount, { amount, src: `/currency/${fileName}` });
    }

    const notes = [...uniqueByAmount.values()].sort((a, b) => a.amount - b.amount);
    if (notes.length > 0) return notes;
  }

  return [];
}
