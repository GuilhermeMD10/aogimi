'use client';

import { useEffect, useState } from 'react';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { getAllBooks, getUserBooks } from '@/features/books';
import type { BookProgressRecord } from '@/features/books/types';

export type ProfileBook = {
  id: string;
  filename: string;
  title: string;
  author: string;
  progress: number;
  finished: boolean;
  /** Real cover art from the local IndexedDB record, when this device has it. */
  coverImage?: string;
};

export type BooksSummary = {
  total: number;
  finished: number;
  /** "MAR 2026" — the earliest import. Null while the shelf is empty. */
  since: string | null;
};

/**
 * The reading record: every backend book, finished first, then most recently
 * read — the list reads as achievements, not a queue.
 *
 * Covers never leave the device (the backend stores metadata only), so they
 * come from the local records; a book imported on another device just falls
 * back to its palette spine.
 */
export function useProfileBooks() {
  const user = useAuthedUser();

  const { data, loading, error, refresh } = useFetchWithAbort<BookProgressRecord[]>(
    (signal) => getUserBooks(user.id, signal),
    [user.id],
  );

  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    getAllBooks()
      .then((local) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const record of local) {
          if (record.coverImage) map[record.filename] = record.coverImage;
        }
        setCovers(map);
      })
      .catch(() => {
        /* No local DB (fresh browser) — palette spines throughout. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const records = data ?? [];

  const books: ProfileBook[] = [...records]
    .sort((a, b) => {
      const aDone = a.progress >= 100 ? 1 : 0;
      const bDone = b.progress >= 100 ? 1 : 0;
      if (aDone !== bDone) return bDone - aDone;
      return new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime();
    })
    .map((r) => ({
      id: r.id,
      filename: r.filename,
      title: r.title,
      author: r.author,
      progress: r.progress,
      finished: r.progress >= 100,
      coverImage: covers[r.filename],
    }));

  // ISO timestamps compare lexically, so no Date round-trip for the minimum.
  const firstImport = records.reduce<string | null>(
    (min, r) => (min === null || r.started_at < min ? r.started_at : min),
    null,
  );

  const summary: BooksSummary = {
    total: records.length,
    finished: records.filter((r) => r.progress >= 100).length,
    since: firstImport
      ? new Date(firstImport)
          .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          .toUpperCase()
      : null,
  };

  return { books, summary, loading, error, refresh };
}
