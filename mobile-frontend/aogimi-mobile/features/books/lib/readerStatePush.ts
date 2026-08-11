// Push pending reader-state writes (bookmarks + last cfi) to the
// backend. Called by Sync-now after the book-import push.
//
// What's "pending":
//   - A bookmark with no `backendId` → was created during an offline
//     session (or the original online POST silently failed). Needs
//     `apiCreateBookmark`.
//   - A bookmark with `backendId` AND `pendingDelete: true` → user
//     removed it locally during an offline session. Needs
//     `apiDeleteBookmark`, then `purgeStoredBookmark` to drop the
//     soft-deleted row.
//   - `lastCfi !== lastCfiPushed` → cfi advanced during the offline
//     session. Send a fresh `sendProgressBeacon` and mark pushed.
//
// Best-effort: per-book failures are isolated, the next book still
// gets a chance. Returns a per-book summary the caller can use to
// decide which session-pending flags can be cleared.

import {
  createBookmark as apiCreateBookmark,
  deleteBookmark as apiDeleteBookmark,
  updateBookProgress,
} from './booksApi';
import {
  loadStoredBook,
  patchStoredBook,
  type StoredBookmark,
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
  /** Total bookmark creates that succeeded across all books. */
  bookmarksCreated: number;
  /** Total bookmark deletes that succeeded across all books. */
  bookmarksDeleted: number;
  /** Books whose cfi was pushed via the progress beacon. */
  cfisPushed: number;
};

/**
 * Determine which bookmarks need a backend operation. Returns separate
 * lists for clarity at the call site. A bookmark in `pendingCreate`
 * has no backendId; one in `pendingDelete` has both backendId and the
 * pendingDelete flag.
 */
function partition(bookmarks: StoredBookmark[]): {
  pendingCreate: StoredBookmark[];
  pendingDelete: StoredBookmark[];
} {
  const pendingCreate: StoredBookmark[] = [];
  const pendingDelete: StoredBookmark[] = [];
  for (const b of bookmarks) {
    if (b.pendingDelete && b.backendId) pendingDelete.push(b);
    else if (!b.backendId && !b.pendingDelete) pendingCreate.push(b);
  }
  return { pendingCreate, pendingDelete };
}

/**
 * Push pending reader state for one book. Returns `true` if every
 * operation succeeded (or there was nothing to do); `false` if any
 * step failed.
 */
export async function pushForBook(book: BookRecord): Promise<{
  clean: boolean;
  created: number;
  deleted: number;
  cfiPushed: boolean;
}> {
  const stored = await loadStoredBook(book.filename);
  if (!stored) return { clean: true, created: 0, deleted: 0, cfiPushed: false };

  const { pendingCreate, pendingDelete } = partition(stored.bookmarks);
  let clean = true;
  let created = 0;
  let deleted = 0;
  let cfiPushed = false;

  // Bookmark creates — POST each, record the returned backendId.
  for (const bm of pendingCreate) {
    try {
      const remote = await apiCreateBookmark(book.id, {
        cfi: bm.cfi,
        label: bm.label,
      });
      await patchStoredBook(book.filename, (current) => ({
        ...current,
        bookmarks: current.bookmarks.map((b) =>
          b.id === bm.id ? { ...b, backendId: remote.id } : b,
        ),
      }));
      created += 1;
    } catch {
      clean = false;
    }
  }

  // Bookmark deletes — DELETE then drop the soft-deleted row.
  for (const bm of pendingDelete) {
    if (!bm.backendId) continue;
    try {
      await apiDeleteBookmark(bm.backendId);
      await patchStoredBook(book.filename, (current) => ({
        ...current,
        bookmarks: current.bookmarks.filter((b) => b.id !== bm.id),
      }));
      deleted += 1;
    } catch {
      clean = false;
    }
  }

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

  return { clean, created, deleted, cfiPushed };
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
    bookmarksCreated: 0,
    bookmarksDeleted: 0,
    cfisPushed: 0,
  };

  const books = await getAllCachedBooks();
  for (const book of books) {
    const result = await pushForBook(book);
    summary.bookmarksCreated += result.created;
    summary.bookmarksDeleted += result.deleted;
    if (result.cfiPushed) summary.cfisPushed += 1;
    if (result.clean) summary.bookIdsClean.push(book.id);
    else summary.bookIdsDirty.push(book.id);
  }

  return summary;
}
