import type {
  EpubBookmark,
  EpubHighlight,
  PdfBookmark,
  ReaderPrefs,
} from '@/components/reader/useBookStorage';
import { getJSON, remove, setJSON } from './_helpers';

function bookKey(filename: string): string {
  return `reader_book_${encodeURIComponent(filename)}`;
}

export interface StoredBook {
  lastCfi?: string;
  lastPage?: number;
  epubHighlights: EpubHighlight[];
  epubBookmarks: EpubBookmark[];
  pdfBookmarks: PdfBookmark[];
  prefs: ReaderPrefs;
}

export function getStoredBook(filename: string): Partial<StoredBook> | null {
  return getJSON<Partial<StoredBook>>(bookKey(filename));
}

export function setStoredBook(filename: string, data: StoredBook): void {
  setJSON(bookKey(filename), data);
}

/** Drop the reader_book_<filename> entry — call on book delete so the
 *  per-book highlights / bookmarks / prefs don't ghost back if the same
 *  filename is re-imported later. */
export function clearStoredBook(filename: string): void {
  remove(bookKey(filename));
}
