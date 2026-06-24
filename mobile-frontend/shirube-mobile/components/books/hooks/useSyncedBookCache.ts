// Owns the offline-paint side of the books library:
//
//   - `cachedBooks`: AsyncStorage-backed copy of the last backend
//     response, painted on cold start so the library doesn't flash
//     empty while the fetch is in flight.
//   - `sessionPendingIds`: ids of synced books that hit a backend
//     error during a reader session; tile renders the UNSYNCED pill
//     for them until the next manual sync clears the flag.
//
// Each successful backend fetch flows through `mergeBackendBooks`
// (newer-wins) and then re-reads the cache so React state reflects
// the post-merge truth (which can differ from the raw `data` when a
// local row is newer than the backend's copy for some records).

import { useEffect, useState } from 'react';
import {
  getAllCachedBooks,
  listSessionPendingIds,
  mergeBackendBooks,
} from '../utils/syncedBookCache';
import type { BookRecord } from '../types';

type UseSyncedBookCacheResult = {
  cachedBooks: BookRecord[];
  sessionPendingIds: Set<string>;
};

/**
 * @param data  The latest backend response — `null` while loading or
 *              when the user is signed out / a guest. When non-null,
 *              triggers the merge + re-read pass.
 */
export function useSyncedBookCache(data: BookRecord[] | null): UseSyncedBookCacheResult {
  const [cachedBooks, setCachedBooks] = useState<BookRecord[]>([]);
  const [sessionPendingIds, setSessionPendingIds] = useState<Set<string>>(new Set());

  // Cold-start hydrate from AsyncStorage. Runs once at mount so the
  // library paints from the previous session's cache even before any
  // network call resolves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cached, pending] = await Promise.all([
        getAllCachedBooks(),
        listSessionPendingIds(),
      ]);
      if (cancelled) return;
      setCachedBooks(cached);
      setSessionPendingIds(new Set(pending));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Merge new backend data into the cache, then re-read so we see
  // the post-merge truth. `mergeBackendBooks` applies newer-wins per
  // last_read_at and drops cache entries the backend no longer lists
  // (deleted on another device).
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      await mergeBackendBooks(data);
      const merged = await getAllCachedBooks();
      if (!cancelled) setCachedBooks(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  // Session-pending flags may have changed (a manual sync clears
  // them for cleanly-pushed books). Refresh whenever `data` updates.
  useEffect(() => {
    let cancelled = false;
    listSessionPendingIds().then((ids) => {
      if (!cancelled) setSessionPendingIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  return { cachedBooks, sessionPendingIds };
}
