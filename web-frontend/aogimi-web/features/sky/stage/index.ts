// The `stage` sub-feature's public surface — the /sky page and the deck data
// layer behind it. It exports far more than a page normally would because the
// deck vocabulary (CardDraft, the quota caps, the SRS meter maths) is borrowed
// by the reader bubble, the dictionary and the app shell; the page itself is
// just the first export.
export { SkyView } from './views/SkyView';
export { DecksProvider } from './providers/DecksProvider';
export { getUserDecks, getUserDecksWithCards } from './lib/decksApi';
export * as decksApi from './lib/decksApi';
export { deckVisuals } from './lib/deckVisuals';
// The SRS meter maths, exported for the sky page's word card — one definition,
// or the two meters drift (both mirror backend/src/services/cardSrsService.js).
export { masteryRank, nextState, rankProgress, shownRank } from './lib/rankProgress';
export { MAX_MEANINGS_ON_CARD } from './lib/cardLimits';
// Quota + field caps mirrored from the backend. Exported because the reader
// bubble creates decks and cards too, and must show the same limits.
export {
  MAX_DECKS,
  MAX_CARDS_PER_DECK,
  MAX_DECK_NAME,
  // `MAX_CARD_BACK` is deliberately NOT exported any more: no surface types a
  // card back now, so nothing outside this feature needs the cap. `back` is
  // derived by `cardBack()` from a capped reading plus at most
  // MAX_CARD_MEANINGS × MAX_CARD_MEANING characters, which can't reach 2000 —
  // the constant stays in `lib/limits.ts` because it still mirrors a live
  // backend cap, it just has no client consumer to hand it to.
  MAX_CARD_CONTEXT,
  MAX_CARD_READING,
  MAX_CARD_MEANING,
  MAX_CARD_MEANINGS,
  deckQuotaMessage,
  cardQuotaMessage,
} from './lib/limits';
export type { DeckRecord, DeckWithCards } from './types';
// The add-card flow's one shape. Owned here because it describes a card and
// ends at `createCard`; built by `features/dictionary`, carried by
// `features/app-shell`, consumed by both add-card forms.
export type { CardDraft, CardRecord } from './types';
