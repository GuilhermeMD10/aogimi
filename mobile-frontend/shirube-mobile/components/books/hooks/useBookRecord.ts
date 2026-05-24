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
import { fetchBook } from '../utils/booksApi';
import {
  cacheBook,
  getCachedBook,
  markSessionPending,
} from '../utils/syncedBookCache';
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

export function useBookRecord(bookId: string): State {
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
      // 1. Cached read — render immediately if available.
      const cached = await getCachedBook(bookId);
      if (cancelled) return;
      if (cached) {
        setBook(cached);
        setLoading(false);
      }

      // 2. Backend hydrate.
      try {
        const fresh = await fetchBook(bookId);
        if (cancelled) return;
        await cacheBook(fresh);
        setBook(fresh);
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
  }, [bookId]);

  return { book, loading, error, offlineMode };
}
