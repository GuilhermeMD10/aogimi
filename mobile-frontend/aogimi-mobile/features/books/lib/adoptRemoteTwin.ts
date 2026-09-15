import { renameBookFile } from './bookPaths';
import { removeEntry, setStoredFileHash } from './bookLocalState';
import { renameBookStorage } from '@/features/books/reader/lib/readerStorage';
import type { BookRecord } from '../types';

/**
 * The bytes under `localFilename` are already on the account as `twin`
 * (same `file_hash`, pushed from another device or found by the matcher).
 * Make the local copy that record's file rather than a second book:
 *
 *   1. Move the file into the twin's filename slot — the backend row is
 *      keyed by filename, and reconcile pairs local files to rows by it,
 *      so a hash-attached book left under its own name reads as an
 *      orphan and gets wiped on the next pass.
 *   2. Drop the local entry for the old name (a pending snapshot, if the
 *      book was imported offline) and record the hash as synced under
 *      the twin's name.
 *   3. Move the reader row (position, progress) with it — reading done
 *      under the old name is reading done in this book.
 *
 * Shared by the +-button import, the pending push and the reconcile pass,
 * so all three resolve "these bytes are already mine" the same way.
 */
export async function adoptRemoteTwin(
  localFilename: string,
  twin: BookRecord,
  fileHash: string,
): Promise<void> {
  renameBookFile(localFilename, twin.filename);
  await removeEntry(localFilename);
  await setStoredFileHash(twin.filename, fileHash);
  await renameBookStorage(localFilename, twin.filename);
}
