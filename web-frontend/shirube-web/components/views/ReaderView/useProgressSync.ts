'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
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
  // useLayoutEffect keeps the ref in sync BEFORE any handler fires in the
  // same commit cycle — writing the ref during render (which is what the
  // bare assignment used to do) violates React's "render must be pure"
  // rule and can let flushProgress observe a half-updated session.
  useLayoutEffect(() => {
    readerSessionRef.current = readerSession;
  }, [readerSession]);

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

  /**
   * Flush latest progress to backend via fetch. Only updates the
   * dedup ref AFTER the request resolves, so a failed POST will be
   * retried by the next flush instead of silently leaving the stale
   * CFI on the server.
   */
  const flushProgress = useCallback(() => {
    const session = readerSessionRef.current;
    const latest = latestProgressRef.current;
    if (!session?.backendBookId || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfi) return;

    const snapshot = { progress: latest.progress, cfi: latest.cfi };
    updateBookProgress(session.backendBookId, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    })
      .then(() => {
        lastSyncedRef.current = snapshot;
      })
      .catch((err) => {
        // Don't mark as synced — next flush will retry. Surfaced as a
        // console warning so a backend outage isn't entirely invisible
        // during a session.
        console.warn('[useProgressSync] flushProgress failed', err);
      });
  }, []);

  /**
   * Flush via sendBeacon (survives page teardown). sendBeacon returns
   * false when the browser refuses to enqueue (queue full / payload too
   * large / disabled). We log when that happens; the page is about to
   * unload so there's no chance to retry inline.
   */
  const beaconFlush = useCallback(() => {
    const session = readerSessionRef.current;
    const latest = latestProgressRef.current;
    if (!session?.backendBookId || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfi) return;

    const queued = sendProgressBeacon(session.backendBookId, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    });
    if (queued) {
      // Browser accepted the beacon for delivery. Treat as best-effort
      // pushed; we can't confirm without a response anyway.
      lastSyncedRef.current = { progress: latest.progress, cfi: latest.cfi };
    } else {
      console.warn('[useProgressSync] sendBeacon refused; progress may not persist');
    }
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
