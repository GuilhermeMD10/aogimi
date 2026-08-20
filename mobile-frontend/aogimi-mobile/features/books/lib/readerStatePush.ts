// Push pending reader-state writes (last cfi + reading progress) to the
// backend. Called by Sync-now after the book-import push.
//
// What's "pending": `lastCfi !== lastCfiPushed`, or `lastProgress !==
// lastProgressPushed` → the position advanced during an offline session.
// Send a fresh `sendProgressBeacon` and mark pushed.
//
// Best-effort: per-book failures are isolated, the next book still
// gets a chance. Returns a per-book summary the caller can use to
// decide which session-pending flags can be cleared.

import { updateBookProgress } from './booksApi';
import {
  loadStoredBook,
  patchStoredBook,
} from '@/features/books/reader/lib/readerStorage';
import { getAllCachedBooks } from './syncedBookCache';
import type { BookRecord } from '../types';

export type ReaderStatePushSummary = {
  /** Book ids whose pending reader state pushed cleanly (or had
   *  nothing to push). Caller can safely clear the session-pending
   *  flag for these. */
  bookIdsClean: string[];
  /** Book ids where at least one operation failed; flag stays set. */
  bookIdsDirty: string[];
  /** Books whose cfi was pushed via the progress beacon. */
  cfisPushed: number;
};

/**
 * Push pending reader state for one book. Returns `true` if every
 * operation succeeded (or there was nothing to do); `false` if any
 * step failed.
 */
export async function pushForBook(book: BookRecord): Promise<{
  clean: boolean;
  cfiPushed: boolean;
}> {
  const stored = await loadStoredBook(book.filename);
  if (!stored) return { clean: true, cfiPushed: false };

  let clean = true;
  let cfiPushed = false;

  // CFI / progress beacon — send if either the cfi OR the progress
  // value has advanced past what the backend last confirmed. The
  // reader's saveLastCfi keeps `lastCfi` fresh every page turn;
  // saveProgressSnapshot mirrors progress + lastReadAt on book close
  // and on AppState background. Pushing the stored progress (not
  // `book.progress`) is what makes the guest-conversion path work:
  // the synthetic pending BookRecord has progress: <stored or 0>, but
  // on the very first sync we want the real number from the
  // per-filename row regardless.
  const cfiDirty = !!stored.lastCfi && stored.lastCfi !== stored.lastCfiPushed;
  const progressDirty =
    stored.lastProgress != null && stored.lastProgress !== stored.lastProgressPushed;
  if (cfiDirty || progressDirty) {
    try {
      await updateBookProgress(book.id, {
        cfiPosition: stored.lastCfi ?? book.cfi_position ?? '',
        progress: stored.lastProgress ?? book.progress,
        spineIndex: book.spine_index,
        totalSpineItems: book.total_spine_items ?? undefined,
      });
      await patchStoredBook(book.filename, (current) => ({
        ...current,
        lastCfiPushed: stored.lastCfi ?? current.lastCfiPushed,
        lastProgressPushed: stored.lastProgress ?? current.lastProgressPushed,
      }));
      cfiPushed = true;
    } catch {
      clean = false;
    }
  }

  return { clean, cfiPushed };
}

/**
 * Walk every cached BookRecord and push its pending reader state.
 * The cached list is the right scope: pending-import books don't
 * have a real backend id yet, so any reader writes on them are
 * irrelevant until the book itself is pushed (which happens before
 * this in HomeScreen.handleSyncNow).
 */
export async function pushAllReaderState(): Promise<ReaderStatePushSummary> {
  const summary: ReaderStatePushSummary = {
    bookIdsClean: [],
    bookIdsDirty: [],
    cfisPushed: 0,
  };

  const books = await getAllCachedBooks();
  for (const book of books) {
    const result = await pushForBook(book);
    if (result.cfiPushed) summary.cfisPushed += 1;
    if (result.clean) summary.bookIdsClean.push(book.id);
    else summary.bookIdsDirty.push(book.id);
  }

  return summary;
}
