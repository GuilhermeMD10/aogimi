'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { updateBookProgress, sendProgressKeepalive } from '@/components/books/utils/booksApi';
import { setReaderProgress } from '@/lib/storage/readerSession';
import type { ReaderSession } from '@/components/providers/ReaderStateProvider';

export type ProgressSnapshot = {
  /** EPUB CFI. Empty string for fixed-layout (manga) books. */
  cfi: string;
  /** 0–100. */
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

/** How often the periodic backstop flush fires while a book is open. The
 *  common case is covered by the exit (visibility/pagehide) and unmount
 *  flushes; this interval only matters for crashes and the occasional
 *  mobile-Safari dropped `pagehide`. Long on purpose — at 60s, even a
 *  thousand concurrent readers is ~16 writes/sec, and the dedup below means
 *  a stationary reader posts nothing. */
const PERIODIC_FLUSH_MS = 60_000;

/** Identity of a position for dedup. Manga has no CFI, so spine index is part
 *  of the key; flowing EPUBs vary by CFI within a spine item. */
function positionKey(s: ProgressSnapshot): string {
  return `${s.cfi}|${s.spineIndex}`;
}

/**
 * Owns reading-position persistence for the active reader session.
 *
 * Model (per the "don't hammer the backend" decision):
 *   - **localStorage** is written on every page turn via `recordProgress`
 *     — cheap, no network, the per-device source of truth between flushes.
 *   - **The backend** is flushed only periodically (a slow backstop), on
 *     exit (`visibilitychange: hidden` / `pagehide`, via a keepalive POST
 *     that survives teardown and carries the Bearer token), and on unmount
 *     / session change (a normal fetch — covers "Back to library", which is
 *     an SPA nav and fires no unload event).
 *
 * The first `recordProgress` of a session only *seeds* the dedup baseline —
 * it is never flushed. That makes opening a book (the initial relocate and
 * the restore `goTo` echo) a no-op against the backend, so a "mark finished"
 * 100 is preserved until the user actually turns a page. Only a position that
 * differs from the seed/last-synced is pushed.
 */
export function useProgressSync(session: ReaderSession | null) {
  const sessionRef = useRef(session);
  // Layout effect so the ref is current before any relocate handler fires in
  // the same commit (writing it during render would violate render purity).
  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const latestRef = useRef<ProgressSnapshot | null>(null);
  const lastSyncedKeyRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  /** Page-turn handler passed to the readers. Buffers locally every call and
   *  seeds the dedup baseline on the first call of a session. Never posts. */
  const recordProgress = useCallback((snapshot: ProgressSnapshot) => {
    const sess = sessionRef.current;
    if (!sess) return;
    setReaderProgress(sess.activeBook.filename, {
      cfi: snapshot.cfi,
      progress: snapshot.progress,
      spineIndex: snapshot.spineIndex,
      totalSpineItems: snapshot.totalSpineItems,
    });
    latestRef.current = snapshot;
    if (!seededRef.current) {
      // The opening position (incl. the restore goTo) is treated as already
      // persisted — seed and bail so it never overwrites the stored row.
      seededRef.current = true;
      lastSyncedKeyRef.current = positionKey(snapshot);
    }
  }, []);

  /** Push the latest position for `sess` to the backend, if it has changed and
   *  the book has a backend id. `keepalive` picks the teardown-safe transport. */
  const flush = useCallback((sess: ReaderSession | null, keepalive: boolean) => {
    if (!sess?.backendBookId) return;
    const latest = latestRef.current;
    if (!latest) return;
    const key = positionKey(latest);
    if (key === lastSyncedKeyRef.current) return;

    const payload = {
      cfiPosition: latest.cfi || undefined,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    };

    if (keepalive) {
      // Best-effort: optimistically mark synced. If the browser/token drops
      // it, the localStorage snapshot still holds the truth for next open.
      if (sendProgressKeepalive(sess.backendBookId, payload)) {
        lastSyncedKeyRef.current = key;
      }
    } else {
      // Only mark synced after the request resolves, so a failure retries on
      // the next flush instead of stranding a stale position on the server.
      updateBookProgress(sess.backendBookId, payload)
        .then(() => { lastSyncedKeyRef.current = key; })
        .catch((err) => { console.warn('[useProgressSync] flush failed', err); });
    }
  }, []);

  useEffect(() => {
    // New session: reset the per-book dedup/seed/latest state. (Runs after the
    // previous session's cleanup below has already flushed its last position.)
    seededRef.current = false;
    lastSyncedKeyRef.current = null;
    latestRef.current = null;

    const onVisChange = () => { if (document.visibilityState === 'hidden') flush(session, true); };
    const onPageHide = () => flush(session, true);
    const intervalId = window.setInterval(() => flush(session, false), PERIODIC_FLUSH_MS);

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', onPageHide);
      // SPA nav back to the library fires no unload event, so flush the
      // outgoing session here (normal fetch — the page is still alive).
      flush(session, false);
    };
  }, [session, flush]);

  return { recordProgress };
}
