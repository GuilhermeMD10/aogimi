'use client';

import { useCallback, useEffect, useRef } from 'react';
import { updateBookProgress, sendProgressBeacon } from '@/components/books/utils/booksApi';
import { setReaderProgress } from '@/lib/storage/readerSession';
import type { ReaderSession } from '@/components/providers/ReaderStateProvider';

export type ProgressSnapshot = {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

/**
 * Owns the reader's progress-sync wiring: latest-snapshot refs, the
 * backend-flush callback, the beacon-flush variant, and the exit-event
 * listeners that fire them on tab hide / page unload.
 *
 * Previously hosted inside `ReaderStateProvider`, but no consumer outside
 * `ReaderView` (and its child readers) ever called any of it — colocating
 * here drops the provider's `readerSessionRef` state-mirrored-into-ref
 * smell and the ~70 lines around it.
 */
export function useProgressSync(readerSession: ReaderSession | null) {
  const latestProgressRef = useRef<ProgressSnapshot | null>(null);
  const lastSyncedRef = useRef<{ progress: number; cfi: string } | null>(null);
  const readerSessionRef = useRef(readerSession);
  readerSessionRef.current = readerSession;

  /** Save progress to localStorage on every page turn. No network. */
  const recordProgress = useCallback((snapshot: ProgressSnapshot) => {
    latestProgressRef.current = snapshot;
    const session = readerSessionRef.current;
    if (!session?.activeBook) return;
    setReaderProgress(session.activeBook.filename, {
      progress: snapshot.progress,
      cfi: snapshot.cfi,
      spineIndex: snapshot.spineIndex,
      totalSpineItems: snapshot.totalSpineItems,
    });
  }, []);

  /** Flush latest progress to backend via fetch. */
  const flushProgress = useCallback(() => {
    const session = readerSessionRef.current;
    const latest = latestProgressRef.current;
    if (!session?.backendBookId || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfi) return;

    lastSyncedRef.current = { progress: latest.progress, cfi: latest.cfi };
    updateBookProgress(session.backendBookId, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    }).catch(() => undefined);
  }, []);

  /** Flush via sendBeacon (survives page teardown). */
  const beaconFlush = useCallback(() => {
    const session = readerSessionRef.current;
    const latest = latestProgressRef.current;
    if (!session?.backendBookId || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfi) return;

    lastSyncedRef.current = { progress: latest.progress, cfi: latest.cfi };
    sendProgressBeacon(session.backendBookId, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    });
  }, []);

  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') flushProgress();
    };
    const onPageHide = () => beaconFlush();

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushProgress, beaconFlush]);

  return { recordProgress, flushProgress };
}
