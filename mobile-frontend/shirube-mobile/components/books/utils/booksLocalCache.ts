import { useEffect, useState } from 'react';
import type { BookRecord } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Optimistic progress cache. The reader writes the latest progress / cfi /
// last-read-at into this in-memory map right before navigating back; the
// library tab merges those patches into the server-returned books list so
// the tile reflects the just-finished session immediately, without waiting
// for the next refresh round-trip.
//
// Patches are best-effort and discarded on app restart — useFocusEffect on
// the library tab kicks a real refresh whenever it regains focus, after
// which server values become canonical.
// ─────────────────────────────────────────────────────────────────────────────

export type LocalProgressPatch = {
  progress: number;
  cfi: string;
  lastReadAt: string;
};

const patches = new Map<string, LocalProgressPatch>();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function setLocalProgress(bookId: string, patch: LocalProgressPatch): void {
  patches.set(bookId, patch);
  notify();
}

export function getLocalProgress(bookId: string): LocalProgressPatch | undefined {
  return patches.get(bookId);
}

export function clearLocalProgress(bookId?: string): void {
  if (bookId) patches.delete(bookId);
  else patches.clear();
  notify();
}

/**
 * Subscribe to the patch map. Returns an incrementing version so callers can
 * recompute memoised projections (e.g. a books list) on change.
 */
export function useLocalProgressVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);
  return version;
}

/**
 * Overlay any pending local patches on top of a server-returned book list.
 * Non-patched books pass through untouched.
 */
export function applyLocalProgress(books: BookRecord[]): BookRecord[] {
  if (patches.size === 0) return books;
  return books.map((b) => {
    const p = patches.get(b.id);
    if (!p) return b;
    return {
      ...b,
      progress: p.progress,
      cfi_position: p.cfi,
      last_read_at: p.lastReadAt,
    };
  });
}
