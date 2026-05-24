// Single entry point for "remove a book everywhere it lives". Centralises
// the five-layer cleanup that used to be inlined in ReaderView so the same
// orchestration can be reused (delete from list, delete from reader, batch
// cleanup, future "wipe account" tooling, etc.) and so no caller forgets a
// step — leaving any one layer behind resurrects the book's state if the
// same filename is later re-imported.

import { deleteBook as deleteLocalBook } from './bookStore';
import { deleteBookRecord } from './booksApi';
import { clearStoredBook } from '@/lib/storage/bookPrefs';
import { clearReaderProgress } from '@/lib/storage/readerSession';
import type { Book } from '../types';

/**
 * Remove a book everywhere it lives, in order from canonical to derived:
 *   1. Backend `book_progress` row (and the cascading bookmarks / device
 *      availability the API drops with it).
 *   2. IndexedDB `metadata` + `files` rows in the `shirube-books` DB.
 *   3. localStorage `reader_book_<filename>` (highlights, bookmarks, prefs,
 *      lastCfi).
 *   4. localStorage `reader_progress_<filename>` (the page-turn recovery
 *      snapshot used when the network sync is delayed).
 *
 * Each step is best-effort and independent — a failure in one does not
 * prevent the others. Steps 2–4 are no-ops on books that never lived here
 * (e.g. a synced-from-another-device entry whose file was never imported
 * locally), so it's safe to call on any Book.
 */
export async function deleteBookEverywhere(book: Book): Promise<void> {
  if (book.backendId) {
    await deleteBookRecord(book.backendId).catch(() => undefined);
  }
  await deleteLocalBook(book.id).catch(() => undefined);
  clearStoredBook(book.filename);
  clearReaderProgress(book.filename);
}
