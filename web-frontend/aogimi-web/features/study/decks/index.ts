// Decks sub-feature public surface.
export { default as DecksView } from './components/DecksView';
export { DecksProvider } from './providers/DecksProvider';
export { getUserDecks } from './lib/decksApi';
export * as decksApi from './lib/decksApi';
export { deckVisuals } from './lib/deckVisuals';
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
export type { DeckRecord } from './types';
