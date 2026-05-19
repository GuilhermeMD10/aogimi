import { fetchUserBooks } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
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
  return { books: data ?? [], loading, refreshing, error, refresh };
}
