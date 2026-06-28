// Decks sub-feature public surface.
export { default as DecksView } from './components/DecksView';
export { DecksProvider } from './providers/DecksProvider';
export { getUserDecks } from './lib/decksApi';
export * as decksApi from './lib/decksApi';
export { deckVisuals } from './lib/deckVisuals';
export { MAX_MEANINGS_ON_CARD } from './lib/cardLimits';
export type { DeckRecord } from './types';
