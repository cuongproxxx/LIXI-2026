import { promises as fs } from "node:fs";
import path from "node:path";
import { secureRandomInt } from "@/lib/random";
import type { DeckItem, DeckState, PublicConfig } from "@/lib/types";
import { deckStateSchema } from "@/lib/validation";

const DATA_DIR = path.join(process.cwd(), "data");
const DECK_PATH = path.join(DATA_DIR, "deck.json");

const DEFAULT_DECK_STATE: DeckState = {
  deck: [
    { amount: 10_000, quantity: 2, remaining: 2 },
    { amount: 20_000, quantity: 3, remaining: 3 },
    { amount: 50_000, quantity: 2, remaining: 2 },
    { amount: 100_000, quantity: 1, remaining: 1 }
  ]
};

let queue = Promise.resolve();

function withQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function writeDeck(state: DeckState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DECK_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function sumRemaining(deck: DeckItem[]): number {
  return deck.reduce((total, item) => total + item.remaining, 0);
}

async function readDeckUnsafe(): Promise<DeckState> {
  try {
    const raw = await fs.readFile(DECK_PATH, "utf-8");
    const parsed = deckStateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    // Fallback handled below.
  }

  await writeDeck(DEFAULT_DECK_STATE);
  return DEFAULT_DECK_STATE;
}

function sortDeck(deck: DeckItem[]): DeckItem[] {
  return [...deck].sort((a, b) => a.amount - b.amount);
}

export async function getDeckState(): Promise<DeckState> {
  return withQueue(async () => {
    const state = await readDeckUnsafe();
    return { deck: sortDeck(state.deck) };
  });
}

export async function saveDeckState(state: DeckState): Promise<DeckState> {
  return withQueue(async () => {
    const validated = deckStateSchema.parse({
      deck: sortDeck(state.deck).map((item) => ({
        ...item,
        remaining: Math.min(item.remaining, item.quantity)
      }))
    });
    await writeDeck(validated);
    return validated;
  });
}

export async function getPublicDeckConfig(): Promise<PublicConfig> {
  const state = await getDeckState();
  return {
    deck: state.deck.map((item) => ({ amount: item.amount, remaining: item.remaining })),
    remainingTotal: sumRemaining(state.deck)
  };
}

export async function drawFromDeck(): Promise<{ exhausted: boolean; amount?: number; remainingTotal: number }> {
  return withQueue(async () => {
    const state = await readDeckUnsafe();
    const totalRemaining = sumRemaining(state.deck);
    if (totalRemaining <= 0) return { exhausted: true, remainingTotal: 0 };

    const ticket = secureRandomInt(totalRemaining);
    let cursor = 0;
    let chosenIndex = 0;

    for (let index = 0; index < state.deck.length; index += 1) {
      cursor += state.deck[index].remaining;
      if (ticket < cursor) {
        chosenIndex = index;
        break;
      }
    }

    const selected = state.deck[chosenIndex];
    selected.remaining -= 1;
    await writeDeck({ deck: sortDeck(state.deck) });

    return {
      exhausted: false,
      amount: selected.amount,
      remainingTotal: totalRemaining - 1
    };
  });
}
