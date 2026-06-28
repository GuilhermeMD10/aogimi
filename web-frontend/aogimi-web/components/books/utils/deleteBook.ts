// Single entry point for "remove a book everywhere it lives". Centralises
// the cleanup that used to be inlined in ReaderView so the same
// orchestration can be reused (delete from list, delete from reader, batch
// cleanup, future "wipe account" tooling, etc.) and so no caller forgets a
// step.

import { deleteBook as deleteLocalBook } from './bookStore';
import { deleteBookRecord } from './booksApi';
import { clearReaderProgress } from '@/lib/storage/readerSession';
import type { Book } from '../types';

/**
 * Remove a book everywhere it lives, in order from canonical to derived:
 *   1. Backend `book_progress` row (and the cascading device availability
 *      the API drops with it).
 *   2. IndexedDB `metadata` + `files` rows in the books DB.
 *   3. The localStorage reading-position snapshot, so a later re-import of
 *      the same filename doesn't resume from a stale position.
 *
 * Each step is best-effort and independent — a failure in one does not
 * prevent the others. Step 2 is a no-op on books that never lived here
 * (e.g. a synced-from-another-device entry whose file was never imported
 * locally), so it's safe to call on any Book.
 */
export async function deleteBookEverywhere(book: Book): Promise<void> {
  if (book.backendId) {
    await deleteBookRecord(book.backendId).catch(() => undefined);
  }
  await deleteLocalBook(book.id).catch(() => undefined);
  clearReaderProgress(book.filename);
}
