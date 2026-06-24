// ── Backend `decks` + `cards` row types ─────────────────────────────────────

export interface DeckRecord {
  id: string;
  user_id: number;
  name: string;
  description: string;
  created_at: string;
  card_count: number;
}

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
  created_at: string;
}

// ── UI-facing shapes ────────────────────────────────────────────────────────

/**
 * `CardModel` matches the backend `cards` table columns.
 * `Deck` is the full deck + cards, used in detail/study views.
 * `DeckSummary` is the lightweight version returned by the list endpoint
 * (card_count only, no cards array).
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
};

export type Deck = {
  id: string;
  name: string;
  description?: string;
  cards: CardModel[];
};

export type DeckSummary = {
  id: string;
  name: string;
  description: string;
  card_count: number;
};

export interface DeckPatch {
  name?: string;
  description?: string;
}
