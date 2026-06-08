// Guest → real account promotion. Pushes every locally-pending book,
// deck, card, and reader-state write up to the brand-new account in
// sequence, emitting per-item progress so the UI can show "3 of 7 —
// 食べる" while the loop runs.
//
// Called by AuthContext.convertToAccount AFTER signUp has succeeded.
// Failures inside the loops don't abort the conversion — they leave the
// failed item as pending so the user can retry from the regular
// Sync-now button later.

import { readAllEntries } from '@/components/books/utils/bookLocalState';
import { pushOneBook } from '@/components/books/utils/bookPush';
import { pushForBook } from '@/components/books/utils/readerStatePush';
import { fetchUserBooks } from '@/components/books/utils/booksApi';
import {
  listPendingDecks,
  setDeck,
} from '@/components/decks/utils/deckLocalState';
import { listPendingCards } from '@/components/decks/utils/cardLocalState';
import { pushDeck } from '@/components/decks/utils/deckPush';
import { pushCard } from '@/components/decks/utils/cardPush';

/** Progress emitted by `runConvertPush` as it walks the local pending
 *  data. AuthContext re-exports this so callers can pull either name. */
export type ConvertProgress = {
  stage: 'signup' | 'books' | 'decks' | 'cards' | 'reader-state' | 'done';
  current: number;
  total: number;
  /** Filename / deck name / card front of the item being pushed, when known. */
  label?: string;
};

export async function runConvertPush(
  newUserId: number,
  onProgress: (p: ConvertProgress) => void,
): Promise<void> {
  // ── Books ────────────────────────────────────────────────────────
  // Walk pending entries directly so progress reflects each book by
  // name. Skips entries without a payload (defensive — those exist
  // when the local map is in a half-written state).
  const bookEntries = await readAllEntries();
  const pendingBooks = Object.entries(bookEntries).filter(
    ([, e]) => e.syncState === 'pending' && e.pendingPayload,
  );
  for (let i = 0; i < pendingBooks.length; i++) {
    const [filename, entry] = pendingBooks[i]!;
    onProgress({
      stage: 'books',
      current: i,
      total: pendingBooks.length,
      label: entry.pendingPayload?.title || filename,
    });
    try {
      await pushOneBook(newUserId, filename, entry.pendingPayload!);
    } catch {
      /* leave pending; user retries via Sync-now */
    }
  }
  onProgress({ stage: 'books', current: pendingBooks.length, total: pendingBooks.length });

  // ── Decks ────────────────────────────────────────────────────────
  // Pending decks may have been created as guest with user_id = 0.
  // Rewrite each to the new user id BEFORE pushing so the backend row
  // is owned by the new account.
  const pendingDecks = await listPendingDecks();
  for (let i = 0; i < pendingDecks.length; i++) {
    const deck = pendingDecks[i]!;
    onProgress({
      stage: 'decks',
      current: i,
      total: pendingDecks.length,
      label: deck.name,
    });
    if (deck.user_id !== newUserId) {
      await setDeck({ ...deck, user_id: newUserId });
    }
    const refreshed = { ...deck, user_id: newUserId };
    try {
      await pushDeck(refreshed);
    } catch {
      /* leave pending */
    }
  }
  onProgress({ stage: 'decks', current: pendingDecks.length, total: pendingDecks.length });

  // ── Cards ────────────────────────────────────────────────────────
  // pushDeck's success branch already runs rewriteDeckId, so cards
  // belonging to the freshly-pushed decks now reference the real
  // backend deck ids. pushCard reads the (possibly new) deck_id from
  // local state, so we just iterate the still-pending cards.
  const pendingCards = await listPendingCards();
  for (let i = 0; i < pendingCards.length; i++) {
    const card = pendingCards[i]!;
    onProgress({
      stage: 'cards',
      current: i,
      total: pendingCards.length,
      label: card.front,
    });
    try {
      await pushCard(card);
    } catch {
      /* leave pending */
    }
  }
  onProgress({ stage: 'cards', current: pendingCards.length, total: pendingCards.length });

  // ── Reader state (CFI + bookmarks per book) ──────────────────────
  // pushForBook reads its book by filename, so we need the synced
  // BookRecord for each. Fetch the backend list now that books have
  // been pushed; iterate and push pending reader-state per book.
  let books: Awaited<ReturnType<typeof fetchUserBooks>> = [];
  try {
    books = await fetchUserBooks(newUserId);
  } catch {
    onProgress({ stage: 'reader-state', current: 0, total: 0 });
    return;
  }
  for (let i = 0; i < books.length; i++) {
    const book = books[i]!;
    onProgress({
      stage: 'reader-state',
      current: i,
      total: books.length,
      label: book.title,
    });
    try {
      await pushForBook(book);
    } catch {
      /* leave dirty; retries on the next Sync-now */
    }
  }
  onProgress({ stage: 'reader-state', current: books.length, total: books.length });
}
