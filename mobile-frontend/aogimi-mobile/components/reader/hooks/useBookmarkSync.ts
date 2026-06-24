// Bookmark CRUD + cross-session sync for the reader.
//
// What this hook owns:
//   1. On reader open (book + storage hydrated, not offline): one-shot
//      pull of server bookmarks, dedupe against the local set, then
//      retry any pending-delete bookmarks whose DELETE didn't land
//      last session.
//   2. `toggle(currentCfi)` — toggle a bookmark at the current cfi.
//      Add → POST. Existing → local soft-delete + DELETE (purge on
//      success, leave for sync-push retry on failure).
//   3. `removeAt(localId)` — same delete path for the dock's bookmark
//      list affordance.
//
// Previously inlined into ReaderScreen (a 54-line effect plus two
// callbacks). Extracted so the reader page owns "render + dispatch"
// only — the bookmark state machine lives here in one piece.

import { useCallback, useEffect, useRef } from 'react';
import {
  createBookmark as apiCreateBookmark,
  deleteBookmark as apiDeleteBookmark,
  fetchBookmarks as apiFetchBookmarks,
} from '@/components/books/utils/booksApi';
import { loadStoredBook, type StoredBookmark } from '../utils/readerStorage';
import type { BookRecord } from '@/components/books/types';

type BookmarkSyncStorage = {
  bookmarks: StoredBookmark[];
  addBookmark: (b: { cfi: string; label: string }) => StoredBookmark;
  removeBookmark: (id: string) => void;
  setBookmarkBackendId: (localId: string, backendId: string) => void;
  purgeBookmark: (id: string) => void;
};

type UseBookmarkSyncArgs = {
  book: BookRecord | null;
  hydrated: boolean;
  offlineMode: boolean;
  /** Active CFI from the reader, used as the location for `toggle()`. */
  currentCfi: string;
  /** Composed bookmark label, surfaced from the reader's location state. */
  bookmarkLabel: string;
  storage: BookmarkSyncStorage;
};

type UseBookmarkSyncResult = {
  /** Create a bookmark at `currentCfi` if none exists, otherwise delete
   *  the existing one (with backend DELETE if it has a backendId). */
  toggle: () => void;
  /** Same delete path, addressed by local id — for the bookmarks-list
   *  affordance in the dock. */
  removeAt: (localId: string) => void;
};

export function useBookmarkSync({
  book,
  hydrated,
  offlineMode,
  currentCfi,
  bookmarkLabel,
  storage,
}: UseBookmarkSyncArgs): UseBookmarkSyncResult {
  const { bookmarks, addBookmark, removeBookmark, setBookmarkBackendId, purgeBookmark } = storage;

  // One-shot per session. The ref's `current = true` is set BEFORE
  // the async work begins so a second mount/render won't kick off a
  // parallel pull. Reset on every book change via the effect's deps.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!book || !hydrated || syncedRef.current) return;
    if (offlineMode) return;
    syncedRef.current = true;

    let cancelled = false;
    (async () => {
      // Pull server bookmarks and reconcile against the local set.
      try {
        const remote = await apiFetchBookmarks(book.id);
        if (cancelled) return;
        for (const rb of remote) {
          const existing = bookmarks.find((b) => b.cfi === rb.cfi);
          if (existing) {
            if (existing.backendId !== rb.id) {
              setBookmarkBackendId(existing.id, rb.id);
            }
          } else {
            const created = addBookmark({ cfi: rb.cfi, label: rb.label });
            setBookmarkBackendId(created.id, rb.id);
          }
        }
      } catch {
        /* server unreachable — local set unchanged, retry next session */
      }

      if (cancelled) return;

      // Retry pending-delete bookmarks: any soft-deleted local row with
      // a backendId whose DELETE didn't land last session.
      try {
        const stored = await loadStoredBook(book.filename);
        if (cancelled || !stored) return;
        const pendingDeletes = stored.bookmarks.filter(
          (b) => b.pendingDelete && b.backendId,
        );
        for (const bm of pendingDeletes) {
          if (cancelled) return;
          try {
            await apiDeleteBookmark(bm.backendId!);
            purgeBookmark(bm.id);
          } catch {
            /* still unreachable — next session will try again */
          }
        }
      } catch {
        /* storage read failed — skip retry */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, hydrated, offlineMode]);

  // Reset the once-per-session guard whenever the book changes so a
  // navigate-away-and-back re-runs the pull for the new book.
  useEffect(() => {
    syncedRef.current = false;
  }, [book?.id]);

  const deleteWithBackendCleanup = useCallback(
    (localId: string, backendId: string | undefined) => {
      removeBookmark(localId);
      if (!backendId || offlineMode) return;
      void apiDeleteBookmark(backendId)
        .then(() => purgeBookmark(localId))
        .catch(() => undefined);
    },
    [removeBookmark, purgeBookmark, offlineMode],
  );

  const toggle = useCallback(() => {
    if (!currentCfi || !book) return;
    const existing = bookmarks.find((b) => b.cfi === currentCfi);
    if (existing) {
      deleteWithBackendCleanup(existing.id, existing.backendId);
      return;
    }
    const created = addBookmark({ cfi: currentCfi, label: bookmarkLabel });
    if (!offlineMode) {
      void apiCreateBookmark(book.id, { cfi: currentCfi, label: bookmarkLabel })
        .then((row) => setBookmarkBackendId(created.id, row.id))
        .catch(() => undefined);
    }
  }, [
    currentCfi,
    book,
    bookmarks,
    bookmarkLabel,
    addBookmark,
    deleteWithBackendCleanup,
    setBookmarkBackendId,
    offlineMode,
  ]);

  const removeAt = useCallback(
    (localId: string) => {
      const target = bookmarks.find((b) => b.id === localId);
      deleteWithBackendCleanup(localId, target?.backendId);
    },
    [bookmarks, deleteWithBackendCleanup],
  );

  return { toggle, removeAt };
}
