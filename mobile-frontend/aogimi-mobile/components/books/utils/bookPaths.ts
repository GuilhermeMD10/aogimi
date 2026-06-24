import { Directory, File, Paths } from 'expo-file-system';
import type { BookRecord } from '../types';

// Path / existence helpers for the on-device book file store. Kept in a
// separate leaf module (rather than next to `importEpub` in bookFiles.ts)
// so consumers like `epubCover`, `mangaPages`, the foliate / pdf reader
// shells, and the fingerprint pipeline can read book paths without
// pulling in the import-flow side of bookFiles. That eliminates the
// static cycle `bookFiles → wipeBookLocalState → epubCover → bookFiles`
// without resorting to dynamic imports.

const BOOKS_DIR = 'books';

export function booksDir(): Directory {
  const dir = new Directory(Paths.document, BOOKS_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function bookFilePath(filename: string): string {
  return new File(booksDir(), filename).uri;
}

export function bookFileExists(filename: string): boolean {
  return new File(booksDir(), filename).exists;
}

export function hasBookFile(book: BookRecord): boolean {
  return bookFileExists(book.filename);
}

export function deleteBookFile(filename: string): void {
  const file = new File(booksDir(), filename);
  if (file.exists) file.delete();
}

/**
 * Move a book file from one filename to another inside the books
 * directory. Used by the offline import dedup path: when an imported
 * file is found to match a cached BookRecord by `file_hash` but the
 * filename differs, we rename the on-disk file so the cached record
 * (which holds the canonical backend filename) can still resolve to
 * a local file via `bookFileExists` / `bookFilePath`.
 *
 * If a file at the destination already exists with the same name, it
 * is overwritten — by the time we call this we've already verified
 * the bytes match via `file_hash`.
 */
export function renameBookFile(from: string, to: string): void {
  if (from === to) return;
  const src = new File(booksDir(), from);
  if (!src.exists) return;
  const dst = new File(booksDir(), to);
  if (dst.exists) dst.delete();
  src.move(dst);
}

/**
 * Wipe every imported book file from this device. Used by the account-
 * switch reset so a new account doesn't inherit the previous user's
 * library blobs.
 */
export function wipeAllBookFiles(): void {
  try {
    const dir = booksDir();
    if (dir.exists) dir.delete();
  } catch {
    /* best-effort */
  }
}

/**
 * All filenames currently stored in books/. Used by the library-reconcile
 * diff to spot files orphaned by a remote delete.
 */
export function listLocalBookFilenames(): string[] {
  try {
    const list = booksDir().list();
    const names: string[] = [];
    for (const entry of list) {
      if (!(entry instanceof File)) continue;
      const base = entry.uri.split('/').pop();
      if (base) names.push(base);
    }
    return names;
  } catch {
    return [];
  }
}
