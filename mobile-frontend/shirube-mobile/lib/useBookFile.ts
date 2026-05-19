import { useEffect, useState } from 'react';
import { bookFileExists } from '@/lib/bookFiles';
import type { BookRecord } from '@/lib/types';

/**
 * Tracks whether the on-disk EPUB for `book` is present locally.
 * `markAvailable` lets the import flow flip the flag manually after
 * copying the file in, without waiting for a re-render of the parent.
 */
export function useBookFile(book: BookRecord | null): {
  hasFile: boolean;
  markAvailable: (value: boolean) => void;
} {
  const [hasFile, setHasFile] = useState(false);
  useEffect(() => {
    if (book) setHasFile(bookFileExists(book.filename));
  }, [book]);
  return { hasFile, markAvailable: setHasFile };
}
