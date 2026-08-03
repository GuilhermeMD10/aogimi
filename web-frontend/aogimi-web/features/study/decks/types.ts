// ── Backend `decks` + `cards` row types ─────────────────────────────────────

export interface DeckRecord {
  id: string;
  user_id: number;
  name: string;
  /** Still a column, and still written by the mobile app — the web dropped the
   *  feature, so nothing here reads it. */
  description: string;
  created_at: string;
  card_count: number;
  /** The most recently added card, or null for an empty deck. Assembled
   *  server-side by `deckRepository`, so `card_count` and this always agree.
   *  Present on every deck response. */
  last_card: LastCard | null;
}

/** The subset of a card the decks screen shows under "Last Added Word". Not a
 *  `CardRecord` — the SRS columns aren't selected, because nothing on that
 *  screen reads them and shipping them per deck would be waste. */
export interface LastCard {
  id: string;
  front: string;
  reading: string;
  back: string;
  state: CardState;
  created_at: string;
}

/** One deck with its full card inventory, as `GET /api/decks/user/:userId/cards` returns them —
 *  the same deck row as the list endpoint, plus the same card rows as the per-deck endpoint.
 *  Built for the sky page, which needs every card of every deck in one round trip. */
export type DeckWithCards = DeckRecord & { cards: CardRecord[] };

export type CardState = 'new' | 'seen' | 'learned' | 'mastered';

export interface CardRecord {
  id: string;
  deck_id: string;
  front: string;
  reading: string;
  back: string;
  notes: string;
  context_sentence: string;
  state: CardState;
  reviewed_times: number;
  // SRS columns from migration 022.
  difficulty: number;
  stability: number;
  last_outcomes: string;
  last_reviewed_at: string | null;
  /** When the card next falls due (migration 023). Null = never reviewed,
   *  which counts as due now. Computed and persisted server-side — read it,
   *  don't recompute it. */
  next_due_at: string | null;
  created_at: string;
}

// ── UI-facing shapes ────────────────────────────────────────────────────────

/**
 * `CardModel` matches the backend `cards` table columns.
 * `Deck` is the full deck + cards, used in detail/study views.
 * `DeckSummary` is the lightweight version returned by the list endpoint
 * (card_count + last_card, no cards array).
 *
 * None of them carries `description`: the deck-description feature was dropped
 * from the web with the decks redesign. The column and the mobile app's use of
 * it are untouched — see `DeckRecord.description`.
 */

export type CardModel = {
  id: string;
  front: string;
  back: string;
  reading?: string;
  notes?: string;
  context_sentence?: string;
  state?: CardState;
  reviewed_times?: number;
  // Needed by the deck-detail panel: `created_at` is the "Added" sort,
  // and `difficulty` + `last_outcomes` are what `lib/rankProgress` reads to
  // work out how far a card has come toward its next tier.
  created_at?: string;
  difficulty?: number;
  last_outcomes?: string;
  last_reviewed_at?: string | null;
};

export type Deck = {
  id: string;
  name: string;
  cards: CardModel[];
};

export type DeckSummary = {
  id: string;
  name: string;
  card_count: number;
  last_card: LastCard | null;
};

export interface DeckPatch {
  name?: string;
}
