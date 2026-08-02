/**
 * Library limits, mirrored from `backend/src/config/limits.js`.
 * **Change one, change both.**
 *
 * UX only — the backend counts `book_progress` rows on every
 * `POST /api/books` and answers 409 `BOOK_QUOTA_EXCEEDED`. This exists so the
 * import button can refuse before the user waits through a 500 MB file hash.
 *
 * The per-file size caps (`MAX_EPUB_SIZE` / `MAX_PDF_SIZE`) live in
 * `locateAndAttachFile.ts` next to `validateBookFile`, which is the only
 * thing that reads them; they bound one file, not the library.
 */

/** Max books one user can register. Backend: `QUOTAS.BOOKS_PER_USER`. */
export const MAX_BOOKS = 50;

/** Max bookmarks on one book. Backend: `QUOTAS.BOOKMARKS_PER_BOOK`. */
export const MAX_BOOKMARKS_PER_BOOK = 500;

/** Text caps, in characters. Backend: `TEXT.*`. */
export const MAX_BOOK_TITLE = 500;
export const MAX_BOOKMARK_LABEL = 100;

/** Max candidates per `POST /api/books/match` request. Backend:
 *  `ARRAYS.MATCH_CANDIDATES`. The library reconcile batches every local file
 *  into one call, so a library at the book quota is comfortably inside this —
 *  but chunk if that ever stops being true. */
export const MAX_MATCH_CANDIDATES = 200;

export function bookQuotaMessage(current: number): string {
  return `Library limit reached (${current} / ${MAX_BOOKS} books). Remove a book to import another.`;
}
