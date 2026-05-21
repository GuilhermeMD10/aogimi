'use client';

import { useCallback, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, CloudOff } from 'lucide-react';
import { getDeviceId } from '@/lib/storage/device';
import { locateAndAttachFile } from '@/lib/books/locateAndAttachFile';
import type { DeviceBookRecord } from '@/lib/types';
import { BookCoverSwatch, type LibraryBook } from '@/components/library/BookList';

export default function RestoreLibrary({
  remoteBooks,
  userId,
  onComplete,
  onSkip,
}: {
  remoteBooks: DeviceBookRecord[];
  userId: number;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [books, setBooks] = useState<LibraryBook[]>(() =>
    remoteBooks.map(r => ({
      id: r.id,
      title: r.title,
      author: r.author,
      filename: r.filename,
      coverColor: r.cover_color,
      hasCover: false,
      progress: r.progress,
      available: false,
      backendId: r.id,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [locatingBookId, setLocatingBookId] = useState<string | null>(null);
  const locateInputRef = useRef<HTMLInputElement>(null);

  const deviceId = typeof window !== 'undefined' ? getDeviceId() : '';

  const matchedCount = books.filter(b => b.available).length;

  const handleLocateClick = useCallback((bookId: string) => {
    setLocatingBookId(bookId);
    setError(null);
    locateInputRef.current?.click();
  }, []);

  const onLocateFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !locatingBookId) return;
      e.target.value = '';

      const targetBook = books.find(b => b.id === locatingBookId);
      if (!targetBook?.backendId) {
        setLocatingBookId(null);
        return;
      }

      const result = await locateAndAttachFile({
        file,
        userId,
        deviceId,
        target: {
          backendId: targetBook.backendId,
          title: targetBook.title,
          filename: targetBook.filename,
        },
      });
      setLocatingBookId(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setBooks(prev =>
        prev.map(b =>
          b.id === locatingBookId
            ? {
                ...b,
                id: result.record.id,
                hasCover: result.record.hasCover,
                coverImage: result.record.coverImage,
                available: true,
              }
            : b,
        ),
      );
    },
    [locatingBookId, userId, books, deviceId],
  );

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-lgc-bg-elev shadow-sm"
          style={{ border: '1px solid var(--lgc-border)' }}
        >
          <BookOpen size={28} className="text-lgc-accent" />
        </div>

        {/* Heading */}
        <h1
          className="mb-2 text-2xl font-medium tracking-tight text-lgc-fg font-display"
        >
          Welcome back
        </h1>
        <p className="mb-1 text-[15px] text-lgc-fg-muted">
          Your reading progress is here — {remoteBooks.length}{' '}
          {remoteBooks.length === 1 ? 'book' : 'books'} synced.
        </p>
        <p className="mb-6 text-[13px] text-lgc-fg-subtle">
          Point us to your EPUB or PDF files and we&apos;ll match them to your library.
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-left text-[12px] text-red-700">
            {error}
          </div>
        )}

        {/* Compact book list */}
        <div className="mx-auto mb-6 max-h-72 overflow-auto rounded-lg border border-lgc-border bg-lgc-bg-elev text-left">
          {books.map(book => (
            <button
              key={book.id}
              type="button"
              disabled={book.available || locatingBookId === book.id}
              onClick={() => handleLocateClick(book.id)}
              className={`flex w-full items-center gap-2.5 border-b border-lgc-border px-3 py-2 last:border-b-0 transition-colors ${
                book.available
                  ? 'cursor-default'
                  : locatingBookId === book.id
                    ? 'cursor-wait opacity-60'
                    : 'hover:bg-lgc-bg-sunken'
              }`}
            >
              <BookCoverSwatch book={book} size="sm" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-lgc-fg">
                {book.title}
              </span>
              {book.available ? (
                <CheckCircle2 size={14} className="shrink-0 text-green-500" />
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-lgc-fg-subtle">
                  <CloudOff size={10} />
                  Locate
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Progress indicator */}
        {matchedCount > 0 && (
          <p className="mb-4 text-[12px] text-lgc-fg-muted">
            {matchedCount} of {remoteBooks.length} restored
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg bg-lgc-accent px-6 py-2.5 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
          >
            Go to library
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 text-[13px] text-lgc-fg-muted transition-colors hover:text-lgc-fg"
          >
            Skip for now
          </button>
        </div>

        <input
          ref={locateInputRef}
          type="file"
          accept=".epub,.pdf,application/epub+zip,application/pdf"
          onChange={onLocateFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
