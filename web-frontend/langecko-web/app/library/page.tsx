'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  MoreHorizontal,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  getAllBooks,
  importBook,
  syncLocalBooksToBackend,
  type BookRecord,
} from '@/lib/bookStore';
import { type BookProgressRecord } from '@/lib/booksApi';
import { useAuth } from '@/components/providers/AuthProvider';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_EPUB_SIZE = 50 * 1024 * 1024;

function validateEpub(file: File): string | null {
  if (file.type !== 'application/epub+zip' && !file.name.endsWith('.epub'))
    return 'Invalid file type. Please upload an EPUB file.';
  if (file.size > MAX_EPUB_SIZE)
    return 'File too large. Maximum size is 50 MB.';
  return null;
}

// ── Side panel book row ──────────────────────────────────────────────────────

function SidePanelBookRow({
  book,
  progress,
  selected,
  onClick,
}: {
  book: BookRecord;
  progress: number;
  selected: boolean;
  onClick: () => void;
}) {

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left text-[12.5px] transition-colors ${
        selected
          ? 'border-lgc-border bg-lgc-bg-elev'
          : 'border-transparent hover:bg-lgc-bg-elev'
      }`}
    >
      <BookCoverSwatch book={book} size="sm" />
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-lgc-fg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {book.title}
        </div>
        <div className="text-[10px] text-lgc-fg-muted">{progress}%</div>
      </div>
    </button>
  );
}

// ── Book cover swatch ────────────────────────────────────────────────────────

function BookCoverSwatch({
  book,
  size = 'sm',
}: {
  book: BookRecord;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'w-3.5 h-5' : 'w-5 h-6.5';

  if (book.hasCover && book.coverImage) {
    return (
      <img
        src={book.coverImage}
        alt=""
        className={`${dims} shrink-0 rounded-sm object-cover`}
      />
    );
  }

  return (
    <div
      className={`${dims} shrink-0 rounded-sm`}
      style={{ background: book.coverColor }}
    />
  );
}

// ── Main table row ───────────────────────────────────────────────────────────

function BookTableRow({
  book,
  progress,
  onOpen,
}: {
  book: BookRecord;
  progress: number;
  onOpen: () => void;
}) {

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full cursor-pointer items-center border-b border-lgc-border px-3.5 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-lgc-bg-sunken/50"
      style={{
        gridTemplateColumns: '32px 1fr 140px 36px',
      }}
    >
      <BookCoverSwatch book={book} size="md" />
      <div className="min-w-0">
        <div
          className="truncate text-sm text-lgc-fg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {book.title}
        </div>
        <div className="text-[11px] text-lgc-fg-muted">{book.author}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-lgc-bg-sunken">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background:
                progress === 100
                  ? 'var(--lgc-fg-muted)'
                  : 'var(--lgc-accent)',
            }}
          />
        </div>
        <span
          className="min-w-7 text-right text-[10px] text-lgc-fg-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {progress}%
        </span>
      </div>
      <div className="text-right text-lgc-fg-muted">
        <MoreHorizontal size={14} />
      </div>
    </button>
  );
}

// ── Library page ─────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [backendBooks, setBackendBooks] = useState<Map<string, BookProgressRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load books from IndexedDB, sync with backend, merge results
  useEffect(() => {
    const load = async () => {
      try {
        const localBooks = await getAllBooks();
        setBooks(localBooks);
        if (localBooks.length > 0) setSelectedBookId(localBooks[0].id);

        // Sync local books to backend + fetch all backend records
        if (user) {
          try {
            const remoteMap = await syncLocalBooksToBackend(user.id);
            setBackendBooks(remoteMap);

            // Build merged list: local books + backend-only books (cross-browser)
            const localFilenames = new Set(localBooks.map(b => b.filename));
            const backendOnly: BookRecord[] = [];
            for (const [filename, remote] of remoteMap) {
              if (!localFilenames.has(filename)) {
                backendOnly.push({
                  id: filename,
                  title: remote.title,
                  author: remote.author,
                  filename,
                  coverColor: remote.cover_color,
                  hasCover: false,
                  importedAt: remote.created_at,
                  fileSize: 0,
                });
              }
            }
            if (backendOnly.length > 0) {
              setBooks(prev => [...prev, ...backendOnly]);
            }
          } catch {
            // Backend unavailable — work with local data only
          }
        }
      } catch {
        setError('Failed to load library');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  /** Get progress for a book — backend if available, else 0 */
  const getProgress = useCallback(
    (bookId: string) => backendBooks.get(bookId)?.progress ?? 0,
    [backendBooks],
  );

  const handleImport = useCallback(
    async (file: File) => {
      const validationError = validateEpub(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setImporting(true);
      setError(null);
      try {
        const record = await importBook(file, user?.id);
        setBooks((prev) => [...prev, record]);
        setSelectedBookId(record.id);
      } catch {
        setError('Failed to import book');
      } finally {
        setImporting(false);
      }
    },
    [user],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImport(file);
      e.target.value = '';
    },
    [handleImport],
  );

  const openBook = useCallback(
    (bookId: string) => {
      router.push(`/reader/${encodeURIComponent(bookId)}`);
    },
    [router],
  );

  return (
    <div className="flex h-full min-h-0">
      {/* ── Side panel ──────────────────────────────────────────────── */}
      <div
        className="flex h-full flex-col border-r border-lgc-border"
        style={{
          width: 260,
          flexShrink: 0,
          background:
            'color-mix(in oklab, var(--lgc-bg-sunken) 50%, transparent)',
        }}
      >
        {/* Header */}
        <div className="flex items-baseline gap-2 px-5 pb-3 pt-4">
          <span
            className="text-xl font-medium tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Langeco
          </span>
          <span
            className="text-[11px] text-lgc-fg-muted"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            read · learn
          </span>
        </div>

        {/* Search (dummy) */}
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-1.5 rounded-md border border-lgc-border bg-lgc-bg-elev px-2 py-1.5">
            <Search size={12} className="text-lgc-fg-subtle" />
            <span className="flex-1 text-[11px] text-lgc-fg-subtle">
              Filter library
            </span>
            <kbd className="rounded border border-lgc-border-strong px-1 text-[9px] text-lgc-fg-muted" style={{ fontFamily: 'var(--font-mono)' }}>
              /
            </kbd>
          </div>
        </div>

        {/* In progress */}
        <div className="flex-1 overflow-auto px-3">
          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-lgc-fg-muted">
            In progress · {books.length}
          </div>
          <div className="flex flex-col gap-0.5">
            {books.map((book) => (
              <SidePanelBookRow
                key={book.id}
                book={book}
                progress={getProgress(book.id)}
                selected={book.id === selectedBookId}
                onClick={() => openBook(book.id)}
              />
            ))}
          </div>
          {books.length === 0 && !loading && (
            <div className="px-2 py-6 text-center text-[11px] text-lgc-fg-subtle">
              No books yet. Import an EPUB to start reading.
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" style={{ padding: '28px 36px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Header */}
          <div className="mb-2 flex items-baseline justify-between">
            <div>
              <div className="lgc-section-label mb-1.5">Library</div>
              <h1
                className="text-[34px] font-medium tracking-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.015em',
                }}
              >
                Your books
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal size={13} /> Filter
                </span>
              </button>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev"
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown size={13} /> Sort
                </span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-1.5 rounded-md border border-lgc-border-strong px-3 py-1.5 text-[13px] font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev disabled:opacity-50"
              >
                <Plus size={13} />
                {importing ? 'Importing...' : 'Import EPUB'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".epub,application/epub+zip"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="mb-6 text-[13px] text-lgc-fg-muted">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Book table */}
          {books.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-lgc-border bg-lgc-bg-elev">
              {/* Table header */}
              <div
                className="grid border-b border-lgc-border px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-lgc-fg-muted"
                style={{
                  gridTemplateColumns: '32px 1fr 140px 36px',
                }}
              >
                <span />
                <span>Title</span>
                <span>Progress</span>
                <span />
              </div>
              {/* Rows */}
              {books.map((book) => (
                <BookTableRow
                  key={book.id}
                  book={book}
                  progress={getProgress(book.id)}
                  onOpen={() => openBook(book.id)}
                />
              ))}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-lgc-fg-muted">
              Loading library...
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-lgc-border-strong py-20">
              <BookOpen
                size={32}
                className="mb-3 text-lgc-fg-subtle"
              />
              <p className="mb-1 text-sm font-medium text-lgc-fg">
                No books yet
              </p>
              <p className="mb-4 text-[13px] text-lgc-fg-muted">
                Import an EPUB to start building your library.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-2 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
              >
                <Plus size={14} /> Import EPUB
              </button>
            </div>
          )}

          {/* Stats placeholder */}
          <div className="mt-8 flex items-center gap-2.5 rounded-lg border border-dashed border-lgc-border-strong px-5 py-5 text-[12px] text-lgc-fg-subtle">
            <Sparkles size={14} />
            <span>Reading stats · coming later</span>
          </div>
        </div>
      </div>
    </div>
  );
}
