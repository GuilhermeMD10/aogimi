// Single entry point for the "Sync now" button on the decks screen.
// Pushes every pending deck and card in the right order so that
// foreign-key references resolve cleanly.
//
// Order:
//   1. Deck creates  — produces backend ids; cards depending on those
//                      ids get their foreign key patched as part of
//                      `pushDeck`'s success branch.
//   2. Deck updates  — rename / description edits.
//   3. Card creates  — POST against now-real deck ids.
//   4. Card updates  — front/back edits.
//   5. Card deletes  — DELETE before the deck disappears.
//   6. Deck deletes  — once the deck has no remaining cards, the
//                      backend cascade is unambiguous.
//
// Each phase is best-effort. A failure in one phase doesn't stop the
// next from running. The summary lets the UI report what happened.

import { pushAllPendingDecks, type DeckSyncSummary } from './deckPush';
import { pushAllPendingCards, type CardSyncSummary } from './cardPush';

export type DeckSyncAllSummary = {
  decks: DeckSyncSummary;
  cards: CardSyncSummary;
};

export async function syncAllDeckChanges(): Promise<DeckSyncAllSummary> {
  // Decks first — its internal ordering already handles create →
  // update → delete. Creates rewrite card foreign keys via
  // `rewriteDeckId` inside `pushDeck`.
  const decks = await pushAllPendingDecks();
  const cards = await pushAllPendingCards();
  return { decks, cards };
}
