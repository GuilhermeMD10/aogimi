/**
 * Shared cards-feature types.
 *
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
  state?: 'new' | 'learning' | 'mastered';
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

/** Class strings shared across the cards sub-components — kept together so
 *  restyling the "chrome" doesn't mean grepping across six files. */
export const btnBase =
  'rounded-md border border-lgc-border px-3 py-1.5 text-sm text-lgc-fg transition-colors hover:bg-lgc-accent-soft disabled:opacity-40';
export const btnPrimary =
  'rounded-md bg-lgc-accent px-4 py-2 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50';
