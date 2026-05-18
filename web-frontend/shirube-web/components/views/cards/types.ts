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
