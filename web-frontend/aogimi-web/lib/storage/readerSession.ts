import { remove, setJSON } from './_helpers';

// Per-book reading-progress snapshots. Written on every page turn (cheap,
// local) and superseded by backend sync on tab close. Used as a recovery
// hint when the network sync is delayed or fails.

function progressKey(filename: string): string {
  return `reader_progress_${filename}`;
}

export type ReaderProgressSnapshot = {
  progress: number;
  cfi: string;
  spineIndex: number;
  totalSpineItems: number;
  updatedAt: number;
};

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
