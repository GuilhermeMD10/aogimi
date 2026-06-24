// Shared book type. The merged shape combines local IndexedDB metadata with
// the backend's progress record so a single tile can render either side
// (or both, once reconciled).

export interface Book {
  /** Local IndexedDB id (filename), or backend UUID for unavailable books */
  id: string;
  title: string;
  author: string;
  filename: string;
  coverColor: string;
  hasCover: boolean;
  coverImage?: string;
  progress: number;
  /** Whether the EPUB file exists locally on this device */
  available: boolean;
  /** Backend book UUID (for device availability tracking) */
  backendId?: string;
  /** ISO timestamp of the most recent read session (from backend). Local-only books have null. */
  lastReadAt?: string | null;
}
