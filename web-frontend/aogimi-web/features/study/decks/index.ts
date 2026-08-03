// Decks sub-feature public surface.
export { DecksView } from './views/DecksView';
export { DecksProvider } from './providers/DecksProvider';
export { getUserDecks, getUserDecksWithCards } from './lib/decksApi';
export * as decksApi from './lib/decksApi';
export { deckVisuals } from './lib/deckVisuals';
// The SRS meter maths, exported for the sky page's word card — one definition,
// or the two meters drift (both mirror backend/src/services/cardSrsService.js).
export { masteryRank, nextState, rankProgress } from './lib/rankProgress';
export { MAX_MEANINGS_ON_CARD } from './lib/cardLimits';
// Quota + field caps mirrored from the backend. Exported because the reader
// bubble creates decks and cards too, and must show the same limits.
export {
  MAX_DECKS,
  MAX_CARDS_PER_DECK,
  MAX_DECK_NAME,
  MAX_CARD_BACK,
  MAX_CARD_CONTEXT,
  deckQuotaMessage,
  cardQuotaMessage,
} from './lib/limits';
export type { DeckRecord, DeckWithCards } from './types';
