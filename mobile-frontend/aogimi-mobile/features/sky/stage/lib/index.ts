// Barrel for `features/sky/stage/lib`: import several of its modules from one place.
// Files inside this folder import their siblings by path, never through here.
//
// `cardLocalState` and `deckLocalState` both export a `hydrateFromBackend`; here they are
// `hydrateCardsFromBackend` / `hydrateDecksFromBackend` — the names every consumer already
// aliased them to.

export * from './cardBack';
export {
  getAllCards,
  getCardsByDeckId,
  getDeckCardCount,
  type DeckCardStats,
  getDeckCardStats,
  getCard,
  listPendingCards,
  setCard,
  removeCard,
  markCardSynced,
  rewriteDeckId,
  hydrateFromBackend as hydrateCardsFromBackend,
  applyLocalReview,
  revertLocalReview,
  clearAllCards,
} from './cardLocalState';
export * from './cardPush';
export {
  getAllDecks,
  getDeck,
  listPendingDecks,
  setDeck,
  removeDeck,
  markDeckSynced,
  hydrateFromBackend as hydrateDecksFromBackend,
  clearAllDecks,
} from './deckLocalState';
export * from './deckPush';
export * from './decksApi';
export * from './decksSyncAll';
export * from './deckStats';
export * from './deckVisuals';
export * from './limits';
export * from './masteryMix';
export * from './syncByOp';
