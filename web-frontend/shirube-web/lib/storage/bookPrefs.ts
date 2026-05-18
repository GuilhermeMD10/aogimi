import type {
  EpubBookmark,
  EpubHighlight,
  PdfBookmark,
  ReaderPrefs,
} from '@/components/reader/useBookStorage';
import { getJSON, setJSON } from './_helpers';

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
