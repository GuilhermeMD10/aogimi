// The deck the last card was added to — what the Add-card sheet opens with
// selected, so adding a run of words from one book doesn't mean re-picking the
// same deck every time.
//
// A preference, not data: a remembered id that no longer names a deck (deleted,
// or from before a wipe) is simply ignored by the reader of it. User-scoped, so
// `wipeUserData` clears it on an account switch.

import { loadJSON, saveJSON } from '@/lib/storage';

const LAST_DECK_KEY = 'card_last_deck_v1';

export async function getLastDeckId(): Promise<string | null> {
  return loadJSON<string | null>(LAST_DECK_KEY, null);
}

export async function setLastDeckId(deckId: string): Promise<void> {
  await saveJSON(LAST_DECK_KEY, deckId);
}

/**
 * Follow a deck from its client-side id to the backend's. A deck named in the
 * sheet is created locally and synced in the background, so the id stored on
 * save is usually the one about to be re-keyed — without this the next open
 * would find nothing under it and fall back to the first deck.
 */
export async function rewriteLastDeckId(oldDeckId: string, newDeckId: string): Promise<void> {
  if (oldDeckId === newDeckId) return;
  if ((await getLastDeckId()) === oldDeckId) await setLastDeckId(newDeckId);
}
