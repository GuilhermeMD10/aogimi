import { getJSON, remove, setJSON } from '@/lib/storage/_helpers';

// Per-book reading-position snapshots. Written on every page turn (cheap,
// local, no network) and flushed to the backend periodically + on exit by
// `useProgressSync`. Acts as the per-device source of truth between flushes
// and as a recovery hint when a backend flush is delayed or fails — on the
// next open we restore from whichever of (this snapshot, the backend row) is
// newer by timestamp.

function progressKey(filename: string): string {
  return `reader_progress_${filename}`;
}

export type ReaderProgressSnapshot = {
  /** EPUB CFI of the current position. `page-N` for PDFs. Empty string for
   *  fixed-layout (manga) books, which restore by `spineIndex` instead. */
  cfi: string;
  /** 0–100, derived from foliate's reading fraction (page/total for PDFs). */
  progress: number;
  /** Current spine (chapter / page) index; the 1-based page for PDFs. */
  spineIndex: number;
  /** Total spine items — sent so the backend `total_spine_items` stays set. */
  totalSpineItems: number;
  /** ms epoch of the write. Used to reconcile against the backend's
   *  `last_read_at` on restore (newer wins). */
  updatedAt: number;
  /** ms epoch as of which the backend had this snapshot. Absent, or older
   *  than `updatedAt`, means an unpushed session — the library drains it on
   *  its next load (see `pushUnsyncedProgress`). */
  syncedAt?: number;
};

export function getReaderProgress(filename: string): ReaderProgressSnapshot | null {
  return getJSON<ReaderProgressSnapshot>(progressKey(filename));
}

/** Newer than what the backend last confirmed — needs a push. */
export function isReaderProgressUnsynced(snapshot: ReaderProgressSnapshot): boolean {
  return snapshot.updatedAt > (snapshot.syncedAt ?? 0);
}

export function setReaderProgress(
  filename: string,
  snapshot: Omit<ReaderProgressSnapshot, 'updatedAt' | 'syncedAt'>,
): void {
  const prev = getReaderProgress(filename);
  setJSON(progressKey(filename), { ...snapshot, updatedAt: Date.now(), syncedAt: prev?.syncedAt });
}

/** Record that the backend accepted the position as of `syncedAt`. Any
 *  page turn after that instant leaves the snapshot unsynced again. */
export function markReaderProgressSynced(filename: string, syncedAt: number): void {
  const prev = getReaderProgress(filename);
  if (!prev) return;
  setJSON(progressKey(filename), { ...prev, syncedAt });
}

/** Drop the reader_progress_<filename> snapshot — call on book delete so a
 *  later re-import doesn't start from a stale recovery hint. */
export function clearReaderProgress(filename: string): void {
  remove(progressKey(filename));
}
