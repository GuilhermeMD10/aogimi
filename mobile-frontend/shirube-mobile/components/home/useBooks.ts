import { useEffect, useMemo, useState } from 'react';
import { fetchUserBooks } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import { applyLocalProgress, useLocalProgressVersion } from '@/lib/booksLocalCache';
import { listPendingBooks } from '@/lib/sync';
import type { BookRecord } from '@/lib/types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

export type BooksState = {
  books: BookRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  silentRefresh: () => Promise<void>;
};

export function useBooks(): BooksState {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, loading, refreshing, error, refresh, silentRefresh } = useFetchWithAbort<BookRecord[]>(
    (signal) => fetchUserBooks(userId!, signal),
    [userId],
    { enabled: userId != null },
  );

  // Pending (offline-imported, not pushed yet) books — read from the
  // local sync map. Re-read every time the backend fetch completes
  // (i.e., after refresh / silentRefresh / import). Synthetic
  // BookRecord with `id: 'pending:<filename>'` so the library tile
  // open handler can route a tap differently.
  const [pendingBooks, setPendingBooks] = useState<BookRecord[]>([]);
  useEffect(() => {
    if (userId == null) {
      setPendingBooks([]);
      return;
    }
    let cancelled = false;
    listPendingBooks(userId).then((list) => {
      if (!cancelled) setPendingBooks(list);
    });
    return () => {
      cancelled = true;
    };
    // Re-read whenever the backend list updates (a refresh just ran,
    // or an import flipped a book from pending→synced).
  }, [userId, data]);

  // Merge optimistic patches from the reader's back-press over the server
  // list so tiles reflect just-finished sessions before the next refresh
  // round-trip lands. The version bumps whenever a patch is set/cleared,
  // re-running this memo.
  const version = useLocalProgressVersion();
  const books = useMemo(() => {
    // Pending books listed first — they're newer and the user just
    // imported them, so likely interest > older synced books.
    return [...pendingBooks, ...applyLocalProgress(data ?? [])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, version, pendingBooks]);
  return { books, loading, refreshing, error, refresh, silentRefresh };
}
