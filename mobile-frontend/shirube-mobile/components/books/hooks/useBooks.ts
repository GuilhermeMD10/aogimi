import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUserBooks } from '../utils/booksApi';
import { useAuth } from '@/lib/auth/AuthContext';
import { applyLocalProgress, useLocalProgressVersion } from '../utils/booksLocalCache';
import {
  getAllCachedBooks,
  listSessionPendingIds,
  mergeBackendBooks,
} from '../utils/syncedBookCache';
import { listPendingBooks } from '../utils/bookPush';
import type { BookRecord } from '../types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

export type BooksState = {
  books: BookRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  /** Re-reads the local pending-import map and updates `books` to include
   *  any newly-marked entries without round-tripping to the backend.
   *  Use after a local-only commit (e.g. an import while the backend
   *  is unreachable) so the new tile shows up immediately. */
  reloadPending: () => Promise<void>;
  /** Ids of synced books that hit a backend error during a reader
   *  session. Library tiles use this to flip the SyncPill to UNSYNCED.
   *  Cleared by a successful manual sync. */
  sessionPendingIds: Set<string>;
};

export function useBooks(): BooksState {
  const { user, status } = useAuth();
  const userId = user?.id;
  // Backend fetch only fires for real authenticated users. For guests
  // (status === 'guest') we skip the network — the library is still
  // populated from the local pending map below.
  const backendEnabled = status === 'signed-in' && userId != null;
  const { data, loading, refreshing, error, refresh, silentRefresh } = useFetchWithAbort<BookRecord[]>(
    (signal) => fetchUserBooks(userId!, signal),
    [userId, backendEnabled],
    { enabled: backendEnabled },
  );

  // Pending (offline-imported, not pushed yet) books — read from the
  // local sync map. Synthetic BookRecord with `id: 'pending:<filename>'`
  // so the library tile open handler can route a tap differently.
  const [pendingBooks, setPendingBooks] = useState<BookRecord[]>([]);
  const reloadPending = useCallback(async () => {
    if (userId == null) {
      setPendingBooks([]);
      return;
    }
    const list = await listPendingBooks(userId);
    setPendingBooks(list);
  }, [userId]);
  useEffect(() => {
    // Re-read whenever the backend list updates (a refresh just ran,
    // or an import flipped a book from pending→synced). For local-only
    // commits the caller should call reloadPending() directly.
    void reloadPending();
  }, [userId, data, reloadPending]);

  // Synced-book cache + session-pending flags. The cache lets the
  // library render real synced books offline; the pending set lets
  // tiles render the UNSYNCED pill for books that have unpushed
  // session writes.
  const [cachedBooks, setCachedBooks] = useState<BookRecord[]>([]);
  const [sessionPendingIds, setSessionPendingIds] = useState<Set<string>>(new Set());

  // Initial load from cache — paints immediately on cold start, no
  // network required.
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

  // Refresh the cache whenever a successful backend fetch lands.
  // `mergeBackendBooks` applies newer-wins: backend records replace
  // local ones only when the backend `last_read_at` is strictly
  // newer. Local cache entries not in the backend list are dropped
  // (deleted on another device). Then re-read so React state shows
  // the post-merge truth (which can differ from `data` when local
  // is newer for some records).
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

  // Pick up session-pending changes whenever the backend list updates
  // (manual refresh / silent refresh / sync-now would call
  // `clearSessionPending` for resolved books).
  useEffect(() => {
    let cancelled = false;
    listSessionPendingIds().then((ids) => {
      if (!cancelled) setSessionPendingIds(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  // Merge optimistic patches from the reader's back-press over the synced
  // list so tiles reflect just-finished sessions before the next refresh
  // round-trip lands. The version bumps whenever a patch is set/cleared,
  // re-running this memo.
  //
  // Source priority: backend `data` if we have it (fresh from this
  // session), otherwise the AsyncStorage cache (offline / never
  // reached backend this session). Pending books always shown first.
  const version = useLocalProgressVersion();
  const books = useMemo(() => {
    const syncedSource = data ?? cachedBooks;
    return [...pendingBooks, ...applyLocalProgress(syncedSource)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cachedBooks, version, pendingBooks]);

  return {
    books,
    loading,
    refreshing,
    error,
    refresh,
    silentRefresh,
    reloadPending,
    sessionPendingIds,
  };
}
