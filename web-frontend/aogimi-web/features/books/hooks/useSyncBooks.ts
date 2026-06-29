'use client';

import { useEffect, useState } from 'react';
import {
  getAllBooks,
  syncLocalBooksToBackend,
  backfillBookIdentity,
} from '../lib/bookStore';
import type { BookProgressRecord } from '@/features/books/types';
import type { AuthUser } from '@/features/auth/types';
import type { Book } from '../types';

export type PageState = 'loading' | 'restore' | 'library';

/**
 * Owns the page-mount books reconciliation:
 *   IndexedDB → backend sync → merge into a single Book list.
 *
 * "Available on this device" is determined locally: a book counts as
 * available if it has a matching local IDB row with bytes. No device-
 * tracking endpoint involvement.
 *
 * Re-runs on `user` change. Internally tracks a `cancelled` flag so
 * stale fetches can't clobber newer state. Mutators (`setBooks`,
 * `setError`, `setPageState`) are exposed so import / locate / delete
 * / rename handlers in the page can update the same store without
 * round-tripping the API.
 *
 * When `user` is null, falls back to a local-only books view (the
 * signed-out, local-first state).
 */
export function useSyncBooks(user: AuthUser | null) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [books, setBooks] = useState<Book[]>([]);
  const [remoteBooks, setRemoteBooks] = useState<BookProgressRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const localBooks = await getAllBooks();
        if (cancelled) return;

        if (!user) {
          // Unauthed path: show local-only library.
          setBooks(
            localBooks.map((b) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              filename: b.filename,
              coverColor: b.coverColor,
              hasCover: b.hasCover,
              coverImage: b.coverImage,
              progress: 0,
              available: true,
              lastReadAt: null,
            })),
          );
          setPageState('library');
          return;
        }

        let backendMap = new Map<string, BookProgressRecord>();
        try {
          backendMap = await syncLocalBooksToBackend(user.id);
        } catch {
          /* backend unavailable */
        }
        if (cancelled) return;

        const backendBooks = Array.from(backendMap.values());
        setRemoteBooks(backendBooks);

        const localFilenames = new Set(localBooks.map((b) => b.filename));

        if (localBooks.length === 0 && backendBooks.length > 0) {
          setPageState('restore');
          return;
        }

        const merged: Book[] = backendBooks.map((remote) => {
          const local = localBooks.find((b) => b.filename === remote.filename);
          if (local) {
            return {
              id: local.id,
              title: local.title,
              author: local.author,
              filename: local.filename,
              coverColor: local.coverColor,
              hasCover: local.hasCover,
              coverImage: local.coverImage,
              progress: remote.progress,
              available: true,
              backendId: remote.id,
              lastReadAt: remote.last_read_at,
            };
          }
          return {
            id: remote.id,
            title: remote.title,
            author: remote.author,
            filename: remote.filename,
            coverColor: remote.cover_color,
            hasCover: false,
            progress: remote.progress,
            // Backend says we have this book registered but the file
            // isn't in local IDB — the "locate this file" affordance
            // catches that gap.
            available: localFilenames.has(remote.filename),
            backendId: remote.id,
            lastReadAt: remote.last_read_at,
          };
        });

        for (const local of localBooks) {
          if (!backendBooks.find((r) => r.filename === local.filename)) {
            merged.push({
              id: local.id,
              title: local.title,
              author: local.author,
              filename: local.filename,
              coverColor: local.coverColor,
              hasCover: local.hasCover,
              coverImage: local.coverImage,
              progress: 0,
              available: true,
              lastReadAt: null,
            });
          }
        }

        setBooks(merged);
        setPageState('library');

        // Best-effort: backfill identity for any local books missing fileHash
        // whose backend twin also lacks one. Fire-and-forget.
        for (const local of localBooks.filter((b) => !b.fileHash)) {
          const remote = backendMap.get(local.filename);
          if (remote && !remote.file_hash) {
            backfillBookIdentity(local.id, remote.id).catch(() => {});
          }
        }
      } catch {
        if (cancelled) return;
        setError('Failed to load library');
        setPageState('library');
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    pageState,
    setPageState,
    books,
    setBooks,
    remoteBooks,
    error,
    setError,
  };
}
