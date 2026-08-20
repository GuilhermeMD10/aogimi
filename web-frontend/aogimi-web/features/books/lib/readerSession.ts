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
};

export function getReaderProgress(filename: string): ReaderProgressSnapshot | null {
  return getJSON<ReaderProgressSnapshot>(progressKey(filename));
}

export function setReaderProgress(
  filename: string,
  snapshot: Omit<ReaderProgressSnapshot, 'updatedAt'>,
): void {
  setJSON(progressKey(filename), { ...snapshot, updatedAt: Date.now() });
}

/** Drop the reader_progress_<filename> snapshot — call on book delete so a
 *  later re-import doesn't start from a stale recovery hint. */
export function clearReaderProgress(filename: string): void {
  remove(progressKey(filename));
}
