// Shared types + a tiny cover swatch used by RestoreLibrary. The book-list
// rows live in `LibraryDesk` (the new design replaces the old table/stamp
// row variants).

// ── Merged book type ────────────────────────────────────────────────────────

export interface LibraryBook {
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

// ── Book cover swatch ───────────────────────────────────────────────────────

export function BookCoverSwatch({
  book,
  size = 'sm',
}: {
  book: { hasCover: boolean; coverImage?: string; coverColor: string };
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'w-3.5 h-5' : 'w-5 h-6.5';

  if (book.hasCover && book.coverImage) {
    return (
      <img
        src={book.coverImage}
        alt=""
        className={`${dims} shrink-0 rounded-sm object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dims} shrink-0 rounded-sm`}
      style={{ background: book.coverColor }}
    />
  );
}
