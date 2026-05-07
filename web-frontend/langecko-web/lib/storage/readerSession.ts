import { getJSON, setJSON } from './_helpers';

// ── Global reader session state (mode + last filenames + pdf zoom) ──────────

const SHARED_KEY = 'reader_shared_state';

export type ReaderSharedState = {
  mode?: 'epub' | 'pdf';
  pdfPageNumber?: number;
  pdfScale?: number;
  lastEpubFilename?: string;
  lastPdfFilename?: string;
};

export function getReaderSharedState(): ReaderSharedState | null {
  return getJSON<ReaderSharedState>(SHARED_KEY);
}

export function setReaderSharedState(state: ReaderSharedState): void {
  setJSON(SHARED_KEY, state);
}

// ── Per-book progress snapshots (transient — superseded by backend sync) ───

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
