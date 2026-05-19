import { useMemo } from 'react';
import { fetchUserBooks } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import { applyLocalProgress, useLocalProgressVersion } from '@/lib/booksLocalCache';
import type { BookRecord } from '@/lib/types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

export type BooksState = {
  books: BookRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useBooks(): BooksState {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, loading, refreshing, error, refresh } = useFetchWithAbort<BookRecord[]>(
    (signal) => fetchUserBooks(userId!, signal),
    [userId],
    { enabled: userId != null },
  );
  // Merge optimistic patches from the reader's back-press over the server
  // list so tiles reflect just-finished sessions before the next refresh
  // round-trip lands. The version bumps whenever a patch is set/cleared,
  // re-running this memo.
  const version = useLocalProgressVersion();
  const books = useMemo(
    () => applyLocalProgress(data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, version],
  );
  return { books, loading, refreshing, error, refresh };
}
