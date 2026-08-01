'use client';

import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { getUserBooks } from '@/features/books';
import type { BookProgressRecord } from '@/features/books/types';

/**
 * The user's books, newest-read first.
 *
 * Serves both the continue-reading card and the library card. They're separate
 * cards but the same request — splitting it so each "fetches independently"
 * would mean asking the backend for one list twice. Slow books delay both, and
 * that's correct: neither can render without them.
 */
export function useBooks() {
  const user = useAuthedUser();

  const { data, loading, error } = useFetchWithAbort<BookProgressRecord[]>(
    (signal) => getUserBooks(user.id, signal),
    [user.id],
  );

  const books = data ?? [];
  const sorted = [...books].sort(
    (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
  );

  return {
    /** Every book, most recently read first. */
    books: sorted,
    /** The one to offer picking back up, or null when the shelf is empty. */
    current: sorted[0] ?? null,
    loading,
    error,
  };
}
