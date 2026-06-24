import { useMemo } from 'react';
import { fetchUserBooks } from '../utils/booksApi';
import { useAuth } from '@/lib/auth/AuthContext';
import { applyLocalProgress, useLocalProgressVersion } from '../utils/booksLocalCache';
import { usePendingBooks } from './usePendingBooks';
import { useSyncedBookCache } from './useSyncedBookCache';
import type { BookRecord } from '../types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

// Composition layer for the library tile list. Three concerns,
// each owned by its own hook so this file stays a pure orchestrator:
//
//   - usePendingBooks       → reads the local pending-import map
//   - useSyncedBookCache    → AsyncStorage cache + session-pending set
//   - useFetchWithAbort     → backend fetch for signed-in users
//
// The optimistic-merge memo at the bottom layers reader-session patches
// (held in `booksLocalCache`) over whichever synced source is canonical
// (backend `data` if available, otherwise the AsyncStorage cache).

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
  // Backend fetch only fires for real authenticated users. Guests still
  // see their pending books via `usePendingBooks` below; no backend
  // round-trip is involved.
  const backendEnabled = status === 'signed-in' && userId != null;
  const { data, loading, refreshing, error, refresh, silentRefresh } =
    useFetchWithAbort<BookRecord[]>(
      (signal) => fetchUserBooks(userId!, signal),
      [userId, backendEnabled],
      { enabled: backendEnabled },
    );

  const { pendingBooks, reloadPending } = usePendingBooks(userId, data);
  const { cachedBooks, sessionPendingIds } = useSyncedBookCache(data ?? null);

  // Source priority: backend `data` if fresh from this session,
  // otherwise the AsyncStorage cache. Optimistic patches from the
  // reader's back-press layer on top via `applyLocalProgress`. The
  // version ref bumps whenever a patch is set/cleared so the memo
  // re-runs without us listing every patch field as a dep.
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
