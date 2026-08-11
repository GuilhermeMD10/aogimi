// Local-first BookRecord lookup for the reader.
//
// Mount sequence:
//   1. Read the cached BookRecord (populated by useBooks on every
//      successful library fetch). Paint immediately — no network.
//   2. In the background, fetch the latest from backend.
//        - On success: cache + return as the canonical record.
//        - On network failure: mark the book session-pending so the
//          library pill flips to UNSYNCED and the reader stops
//          attempting backend pushes for this session. Keep returning
//          the cached record so the reader can continue.
//        - On HTTP failure (book genuinely gone on backend): surface
//          `error` so the caller can show the not-found state.
//
// Why this shape: the user's rule is "open a book offline, treat the
// session as local until a manual sync". This hook owns the decision
// of when to mark session-pending so individual reader paths don't
// have to repeat the network-vs-HTTP discriminator everywhere.

import { useEffect, useState } from 'react';
import { fetchBook } from '../lib/booksApi';
import {
  cacheBook,
  getCachedBook,
  markSessionPending,
} from '../lib/syncedBookCache';
import { getEntry } from '../lib/bookLocalState';
import { isNewer } from '../lib/timestamps';
import {
  buildPendingBookRecord,
  filenameFromPendingId,
  isPendingBookId,
} from '../lib/bookPush';
import { loadStoredBook } from '@/features/books/reader/lib/readerStorage';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { isOnlineNow } from '@/lib/network/network';
import type { BookRecord } from '../types';

type State = {
  book: BookRecord | null;
  loading: boolean;
  error: string | null;
  /** True when the reader is operating against the local cache because
   *  backend was unreachable. Caller can use this to gate backend
   *  pushes (bookmarks, progress beacon, etc.) for the session. */
  offlineMode: boolean;
};

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

type PendingResolve =
  | { status: 'ok'; book: BookRecord }
  | { status: 'not-found' };

/**
 * Resolve a pending book id (`pending:<filename>`) by reading the
 * local pending entry + any persisted reader-state (lastCfi, lastProgress,
 * lastReadAt) and assembling a synthetic BookRecord.
 *
 * Returns `not-found` if the local pending entry is missing — that's
 * the only failure mode here since there's no backend to consult.
 */
async function resolvePendingBook(bookId: string, userId: number): Promise<PendingResolve> {
  const filename = filenameFromPendingId(bookId);
  const [entry, stored] = await Promise.all([
    getEntry(filename),
    loadStoredBook(filename).catch(() => null),
  ]);
  if (!entry || !entry.pendingPayload) return { status: 'not-found' };
  return {
    status: 'ok',
    book: buildPendingBookRecord(
      filename,
      entry,
      userId,
      stored
        ? { lastCfi: stored.lastCfi, lastProgress: stored.lastProgress, lastReadAt: stored.lastReadAt }
        : undefined,
    ),
  };
}

export function useBookRecord(bookId: string): State {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [book, setBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOfflineMode(false);

    (async () => {
      // Pending book: no backend record exists yet (offline import, or
      // guest account that never pushes). Reconstructed from the local
      // pending entry + persisted reader-state via the helper above; the
      // reader runs in offlineMode so it skips all backend pushes.
      if (isPendingBookId(bookId)) {
        const resolved = await resolvePendingBook(bookId, userId);
        if (cancelled) return;
        if (resolved.status === 'not-found') {
          setError('Book not found locally');
          setLoading(false);
          return;
        }
        setBook(resolved.book);
        setOfflineMode(true);
        setLoading(false);
        return;
      }

      // 1. Cached read — render immediately if available.
      const cached = await getCachedBook(bookId);
      if (cancelled) return;
      if (cached) {
        setBook(cached);
        setLoading(false);
      }

      // Skip the backend hydrate entirely when we already know we're
      // offline. Saves a round-trip that would fail anyway and lets
      // the reader open instantly. The book is still flagged
      // session-pending so the library UI reflects "needs sync".
      if (!isOnlineNow()) {
        if (cached) {
          await markSessionPending(bookId);
          setOfflineMode(true);
        } else {
          setError('Offline — open this book once with a connection.');
        }
        setLoading(false);
        return;
      }

      // 2. Backend hydrate. Newer-wins: only overwrite the cached
      //    record (and surface the backend version) when the backend
      //    `last_read_at` is strictly newer than the local cache.
      //    If the cache is newer (an unpushed reading session), we
      //    keep painting the local version — the next Sync-now will
      //    reconcile.
      try {
        const fresh = await fetchBook(bookId);
        if (cancelled) return;
        if (!cached || isNewer(fresh.last_read_at, cached.last_read_at)) {
          await cacheBook(fresh);
          setBook(fresh);
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          // Offline. If we had a cache, keep using it; flag the book
          // as session-pending so the library reflects the local-only
          // state.
          await markSessionPending(bookId);
          setOfflineMode(true);
          if (!cached) {
            // No cache + no network = nothing to render.
            setError('Offline — open this book once with a connection.');
          }
          setLoading(false);
        } else {
          // Real HTTP failure (404, etc). Surface the error.
          setError(err instanceof Error ? err.message : 'Failed to load book');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId, userId]);

  return { book, loading, error, offlineMode };
}
