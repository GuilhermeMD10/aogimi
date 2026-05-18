import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import type { BookRecord } from './types';

const BOOKS_DIR = 'books';

function booksDir(): Directory {
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

/**
 * Prompt the user to pick an EPUB, copy it into the app's documents dir, and
 * return the stored filename + suggested metadata.
 *
 * The filename returned is the original file name from the picker. If a file
 * with the same name already exists locally, it is overwritten — the unique
 * constraint on (user_id, filename) in book_progress keeps the backend clean.
 */
export async function importEpub(): Promise<{
  filename: string;
  title: string;
  author: string;
  uri: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/epub+zip', 'application/zip', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  const filename = asset.name || `book-${Date.now()}.epub`;
  const dir = booksDir();
  const target = new File(dir, filename);
  if (target.exists) target.delete();

  const source = new File(asset.uri);
  source.copy(target);

  const { title, author } = metadataFromFilename(filename);
  return { filename, title, author, uri: target.uri };
}

export function deleteBookFile(filename: string): void {
  const file = new File(booksDir(), filename);
  if (file.exists) file.delete();
}

/**
 * All EPUB filenames currently stored in books/. Used by the
 * library-reconcile diff to spot files orphaned by a remote delete.
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

/**
 * Prompt the user to pick an EPUB and store it under the given target filename
 * (i.e. the filename already in an existing book record). Useful for
 * reconciling cross-device records that don't yet have the file locally.
 *
 * Returns the stored URI on success, or null on cancel.
 */
export async function importEpubForFilename(
  targetFilename: string,
): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/epub+zip', 'application/zip', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  const dir = booksDir();
  const target = new File(dir, targetFilename);
  if (target.exists) target.delete();

  const source = new File(asset.uri);
  source.copy(target);
  return target.uri;
}

function metadataFromFilename(filename: string): { title: string; author: string } {
  const stem = filename.replace(/\.[^.]+$/, '');
  // Common patterns: "Title - Author", "Author - Title", "Title_Author"
  const hyphenSplit = stem.split(/\s*-\s*/);
  if (hyphenSplit.length >= 2) {
    return { title: hyphenSplit[0]!.trim(), author: hyphenSplit.slice(1).join(' - ').trim() };
  }
  return { title: stem.replace(/[_]+/g, ' ').trim(), author: '' };
}
