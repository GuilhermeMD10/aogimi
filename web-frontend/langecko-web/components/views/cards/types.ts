/**
 * Shared cards-feature types.
 *
 * Kept as plain types (not a Zod schema) to match the rest of the client
 * codebase. `description` is optional because decks persisted before the
 * field existed won't have it — we handle that at read time.
 */

export type CardModel = {
  id: string;
  front: string;
  back: string;
};

export type Deck = {
  id: string;
  name: string;
  description?: string;
  cards: CardModel[];
};

export interface DeckPatch {
  name?: string;
  description?: string;
}

/** Class strings shared across the cards sub-components — kept together so
 *  restyling the "chrome" doesn't mean grepping across six files. */
export const btnBase =
  'rounded border border-lumina-border-divider px-3 py-1 text-sm bg-white text-lumina-primary-text hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-white';
export const btnPrimary =
  'rounded border border-lumina-primary-teal bg-lumina-primary-teal text-black px-4 py-2 text-sm font-medium hover:bg-lumina-primary-teal/90 disabled:opacity-50';
