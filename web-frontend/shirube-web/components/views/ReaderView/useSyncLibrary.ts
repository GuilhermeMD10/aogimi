'use client';

import { useEffect, useState } from 'react';
import {
  getAllBooks,
  syncLocalBooksToBackend,
  backfillBookIdentity,
} from '@/lib/bookStore';
import { getDeviceId } from '@/lib/storage/device';
import { getDeviceName } from '@/lib/util/deviceName';
import {
  registerDevice,
  getDeviceBooks,
  markBookAvailable,
} from '@/lib/devicesApi';
import type { BookProgressRecord, DeviceBookRecord } from '@/lib/types';
import type { AuthUser } from '@/lib/types/user';
import type { LibraryBook } from '@/components/library/BookList';

export type PageState = 'loading' | 'restore' | 'library';

/**
 * Owns the page-mount library reconciliation:
 *   IndexedDB → backend sync → device registration → device-books fetch
 *   → merge into a single LibraryBook list.
 *
 * Re-runs on `user` change. Internally tracks a `cancelled` flag so stale
 * fetches can't clobber newer state. Mutators (`setBooks`, `setError`,
 * `setPageState`) are exposed so import / locate / delete / rename handlers
 * in the page can update the same store without round-tripping the API.
 *
 * When `user` is null, falls back to a local-only library view (used by the
 * stamp variant which doesn't gate behind useAuthedUser).
 */
export function useSyncLibrary(user: AuthUser | null) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [remoteBooks, setRemoteBooks] = useState<DeviceBookRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const localBooks = await getAllBooks();
        if (cancelled) return;

        if (!user) {
          // Unauthed path (stamp variant): show local-only library.
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

        const deviceId = getDeviceId();
        const deviceName = getDeviceName();
        try {
          await registerDevice(user.id, deviceId, deviceName);
        } catch {
          /* best-effort */
        }

        let backendMap = new Map<string, BookProgressRecord>();
        try {
          backendMap = await syncLocalBooksToBackend(user.id);
        } catch {
          /* backend unavailable */
        }
        if (cancelled) return;

        const localFilenames = new Set(localBooks.map((b) => b.filename));
        for (const [filename, remote] of backendMap) {
          if (localFilenames.has(filename)) {
            markBookAvailable(deviceId, remote.id, user.id).catch(() => {});
          }
        }

        let deviceBooks: DeviceBookRecord[] = [];
        try {
          deviceBooks = await getDeviceBooks(deviceId, user.id);
        } catch {
          deviceBooks = Array.from(backendMap.values()).map((r) => ({
            ...r,
            available: localFilenames.has(r.filename),
          }));
        }
        if (cancelled) return;
        setRemoteBooks(deviceBooks);

        if (localBooks.length === 0 && deviceBooks.length > 0) {
          setPageState('restore');
          return;
        }

        const merged: LibraryBook[] = deviceBooks.map((remote) => {
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
            available: remote.available,
            backendId: remote.id,
            lastReadAt: remote.last_read_at,
          };
        });

        for (const local of localBooks) {
          if (!deviceBooks.find((r) => r.filename === local.filename)) {
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
