export interface DeckItem {
  amount: number;
  quantity: number;
  remaining: number;
}

export interface DeckState {
  deck: DeckItem[];
}

export interface PublicConfig {
  deck: Array<Pick<DeckItem, "amount" | "remaining">>;
  remainingTotal: number;
}

export interface DrawResult {
  ok: boolean;
  amount: number;
  remainingTotal: number;
}
