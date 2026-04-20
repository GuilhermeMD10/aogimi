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
  CloudOff,
  Trash2,
} from 'lucide-react';
import {
  getAllBooks,
  importBook,
  syncLocalBooksToBackend,
  backfillBookIdentity,
  deleteBook as deleteLocalBook,
} from '@/lib/bookStore';
import { matchBooks, deleteBookRecord, type BookProgressRecord } from '@/lib/booksApi';
import { computeEpubIdentity } from '@/lib/epubIdentity';
import { getDeviceId, getDeviceName } from '@/lib/deviceId';
import {
  registerDevice,
  getDeviceBooks,
  markBookAvailable,
  type DeviceBookRecord,
} from '@/lib/devicesApi';
import { useAuth } from '@/components/providers/AuthProvider';
import RestoreLibrary from '@/components/library/RestoreLibrary';
import FsAccessBanner from '@/components/library/FsAccessBanner';
import OnboardingExplainer from '@/components/onboarding/OnboardingExplainer';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_EPUB_SIZE = 50 * 1024 * 1024;

type PageState = 'loading' | 'restore' | 'library';

function validateEpub(file: File): string | null {
  if (file.type !== 'application/epub+zip' && !file.name.endsWith('.epub'))
    return 'Invalid file type. Please upload an EPUB file.';
  if (file.size > MAX_EPUB_SIZE)
    return 'File too large. Maximum size is 50 MB.';
  return null;
}

// ── Merged book type ────────────────────────────────────────────────────────

export interface LibraryBook {
  /** Local IndexedDB id (filename), or backend UUID for unavailable books */
  id: string;
  title: string;
  author: string;
  filename: string;
  coverColor: string;
  hasCover: boolean;
  coverImage?: string;
  progress: number;
  /** Whether the EPUB file exists locally on this device */
  available: boolean;
  /** Backend book UUID (for device availability tracking) */
  backendId?: string;
}

// ── Side panel book row ──────────────────────────────────────────────────────

function SidePanelBookRow({
  book,
  selected,
  onClick,
}: {
  book: LibraryBook;
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
      } ${!book.available ? 'opacity-50' : ''}`}
    >
      <BookCoverSwatch book={book} size="sm" />
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-lgc-fg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {book.title}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-lgc-fg-muted">
          {book.available ? (
            <span>{book.progress}%</span>
          ) : (
            <>
              <CloudOff size={9} />
              <span>Unavailable</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Book cover swatch ────────────────────────────────────────────────────────

function BookCoverSwatch({
  book,
  size = 'sm',
}: {
  book: { hasCover: boolean; coverImage?: string; coverColor: string };
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
  onOpen,
  onLocate,
  onDelete,
}: {
  book: LibraryBook;
  onOpen: () => void;
  onLocate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Close menu on outside click or scroll
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', close, true);
    };
  }, [menuOpen]);

  return (
    <div
      className={`grid w-full items-center border-b border-lgc-border px-3.5 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-lgc-bg-sunken/50 ${
        !book.available ? 'opacity-60' : ''
      }`}
      style={{ gridTemplateColumns: '32px 1fr 140px 36px' }}
    >
      <button type="button" className="contents cursor-pointer" onClick={book.available ? onOpen : onLocate}>
        <BookCoverSwatch book={book} size="md" />
        <div className="min-w-0">
          <div
            className="truncate text-sm text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {book.title}
          </div>
          <div className="text-[11px] text-lgc-fg-muted">
            {book.available ? book.author : (
              <span className="flex items-center gap-1">
                <CloudOff size={10} /> File not on this device
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {book.available ? (
            <>
              <div className="h-1 flex-1 rounded-full bg-lgc-bg-sunken">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${book.progress}%`,
                    background:
                      book.progress === 100
                        ? 'var(--lgc-fg-muted)'
                        : 'var(--lgc-accent)',
                  }}
                />
              </div>
              <span
                className="min-w-7 text-right text-[10px] text-lgc-fg-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {book.progress}%
              </span>
            </>
          ) : (
            <span className="text-[11px] text-lgc-accent">Locate file</span>
          )}
        </div>
      </button>
      <div className="text-right">
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            if (!menuOpen && btnRef.current) {
              const rect = btnRef.current.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
            }
            setMenuOpen(prev => !prev);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-lgc-border-strong bg-lgc-bg-elev shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-500 transition-colors hover:bg-lgc-bg-sunken"
            >
              <Trash2 size={13} /> Delete book
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Library page ─────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [remoteBooks, setRemoteBooks] = useState<DeviceBookRecord[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locateInputRef = useRef<HTMLInputElement>(null);
  const [locatingBookId, setLocatingBookId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deletingBook, setDeletingBook] = useState<LibraryBook | null>(null);

  // Check for onboarding flag on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('lgc_needs_onboarding') === 'true') {
        setShowOnboarding(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Load books, register device, merge local + remote
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const localBooks = await getAllBooks();
        if (cancelled) return;

        if (!user) {
          // Not logged in — show local books only
          const merged: LibraryBook[] = localBooks.map(b => ({
            id: b.id,
            title: b.title,
            author: b.author,
            filename: b.filename,
            coverColor: b.coverColor,
            hasCover: b.hasCover,
            coverImage: b.coverImage,
            progress: 0,
            available: true,
          }));
          setBooks(merged);
          if (merged.length > 0) setSelectedBookId(merged[0].id);
          setPageState('library');
          return;
        }

        // Register this device
        const deviceId = getDeviceId();
        const deviceName = getDeviceName();
        try {
          await registerDevice(user.id, deviceId, deviceName);
        } catch {
          // Device registration is best-effort
        }

        // Sync local books to backend
        let backendMap = new Map<string, BookProgressRecord>();
        try {
          backendMap = await syncLocalBooksToBackend(user.id);
        } catch {
          // Backend unavailable — work with local data only
        }
        if (cancelled) return;

        // Mark local books as available on this device
        const localFilenames = new Set(localBooks.map(b => b.filename));
        for (const [filename, remote] of backendMap) {
          if (localFilenames.has(filename)) {
            markBookAvailable(deviceId, remote.id, user.id).catch(() => {});
          }
        }

        // Fetch device-aware book list (with available flag)
        let deviceBooks: DeviceBookRecord[] = [];
        try {
          deviceBooks = await getDeviceBooks(deviceId, user.id);
        } catch {
          // Fallback: treat all backend books as unavailable except local ones
          deviceBooks = Array.from(backendMap.values()).map(r => ({
            ...r,
            available: localFilenames.has(r.filename),
          }));
        }
        if (cancelled) return;
        setRemoteBooks(deviceBooks);

        // Check if this is a new device needing restore
        if (localBooks.length === 0 && deviceBooks.length > 0) {
          setPageState('restore');
          return;
        }

        // Merge: use local data for available books (has cover images etc),
        // use backend data for unavailable ones
        const merged: LibraryBook[] = deviceBooks.map(remote => {
          const local = localBooks.find(b => b.filename === remote.filename);
          if (local) {
            return {
              id: local.id,
              title: local.title,
              author: local.author,
              filename: local.filename,
              coverColor: local.coverColor,
              hasCover: local.hasCover,
              coverImage: local.coverImage,
              progress: remote.progress,
              available: true,
              backendId: remote.id,
            };
          }
          // Backend-only book — not available locally
          return {
            id: remote.id,
            title: remote.title,
            author: remote.author,
            filename: remote.filename,
            coverColor: remote.cover_color,
            hasCover: false,
            progress: remote.progress,
            available: remote.available,
            backendId: remote.id,
          };
        });

        // Add any local-only books (not yet synced)
        for (const local of localBooks) {
          if (!deviceBooks.find(r => r.filename === local.filename)) {
            merged.push({
              id: local.id,
              title: local.title,
              author: local.author,
              filename: local.filename,
              coverColor: local.coverColor,
              hasCover: local.hasCover,
              coverImage: local.coverImage,
              progress: 0,
              available: true,
            });
          }
        }

        setBooks(merged);
        if (merged.length > 0) setSelectedBookId(merged[0].id);
        setPageState('library');

        // Lazy backfill identity hashes
        for (const local of localBooks.filter(b => !b.fileHash)) {
          const remote = backendMap.get(local.filename);
          if (remote && !remote.file_hash) {
            backfillBookIdentity(local.id, remote.id).catch(() => {});
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load library');
        if (!cancelled) setPageState('library');
      }
    };
    load();

    return () => { cancelled = true; };
  }, [user]);

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

        // Mark as available on this device
        if (user) {
          const deviceId = getDeviceId();
          try {
            const backendMap = await syncLocalBooksToBackend(user.id);
            const remote = backendMap.get(record.filename);
            if (remote) {
              await markBookAvailable(deviceId, remote.id, user.id);
            }
          } catch {
            // best-effort
          }
        }

        const newBook: LibraryBook = {
          id: record.id,
          title: record.title,
          author: record.author,
          filename: record.filename,
          coverColor: record.coverColor,
          hasCover: record.hasCover,
          coverImage: record.coverImage,
          progress: 0,
          available: true,
        };
        setBooks(prev => [...prev, newBook]);
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

  /** Handle "locate file" for an unavailable book — verifies the file matches first */
  const onLocateFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !locatingBookId) return;
      e.target.value = '';

      const validationError = validateEpub(file);
      if (validationError) {
        setError(validationError);
        setLocatingBookId(null);
        return;
      }

      const targetBook = books.find(b => b.id === locatingBookId);
      if (!targetBook || !user) {
        setLocatingBookId(null);
        return;
      }

      try {
        // Compute identity of the selected file
        const arrayBuffer = await file.arrayBuffer();
        const identity = await computeEpubIdentity(arrayBuffer).catch(() => null);

        // Ask the backend to match this file against the user's library
        const candidates = [{
          file_hash: identity?.fileHash ?? '',
          content_hash: identity?.contentHash ?? '',
          metadata: {
            title: '',
            author: '',
            dc_identifier: identity?.dcIdentifier ?? null,
            filename: file.name,
          },
        }];

        const results = await matchBooks(user.id, candidates);
        const match = results[0];

        // Verify the match corresponds to the specific book we're locating
        const matchedBackendId = match?.match?.id;
        if (!match || matchedBackendId !== targetBook.backendId) {
          setError(
            `This file doesn\u2019t match "${targetBook.title}". ` +
            (match ? `It matched a different book ("${match.match.title}").` : 'No matching book found.'),
          );
          setLocatingBookId(null);
          return;
        }

        // Match confirmed — import locally and mark available
        const record = await importBook(file, user.id);

        const deviceId = getDeviceId();
        markBookAvailable(deviceId, targetBook.backendId!, user.id).catch(() => {});

        // Update the book in the list to mark it as available
        setBooks(prev =>
          prev.map(b =>
            b.id === locatingBookId
              ? {
                  ...b,
                  id: record.id,
                  hasCover: record.hasCover,
                  coverImage: record.coverImage,
                  available: true,
                }
              : b,
          ),
        );
      } catch {
        setError('Failed to verify located file');
      } finally {
        setLocatingBookId(null);
      }
    },
    [locatingBookId, user, books],
  );

  const openBook = useCallback(
    (bookId: string) => {
      router.push(`/reader/${encodeURIComponent(bookId)}`);
    },
    [router],
  );

  const handleLocateClick = useCallback((bookId: string) => {
    setLocatingBookId(bookId);
    locateInputRef.current?.click();
  }, []);

  const handleDeleteBook = useCallback(
    async (book: LibraryBook) => {
      setError(null);
      try {
        // Delete from backend if we have a backend id
        if (book.backendId) {
          await deleteBookRecord(book.backendId).catch(() => {});
        }
        // Delete from local IndexedDB (file + metadata)
        if (book.available) {
          await deleteLocalBook(book.id).catch(() => {});
        }
        // Remove from UI
        setBooks(prev => prev.filter(b => b.id !== book.id));
        if (selectedBookId === book.id) {
          setSelectedBookId(null);
        }
        setDeletingBook(null);
      } catch {
        setError('Failed to delete book');
      }
    },
    [selectedBookId],
  );

  const handleRestoreComplete = useCallback(() => {
    setPageState('loading');
    // Re-trigger the main useEffect by forcing a re-render
    // The effect depends on [user] which hasn't changed, so we reload
    window.location.reload();
  }, []);

  // ── Restore screen ─────────────────────────────────────────────────────────
  if (pageState === 'restore') {
    return (
      <RestoreLibrary
        remoteBooks={remoteBooks}
        userId={user!.id}
        onComplete={handleRestoreComplete}
        onSkip={() => {
          // Convert remote books to library books as unavailable
          const merged: LibraryBook[] = remoteBooks.map(r => ({
            id: r.id,
            title: r.title,
            author: r.author,
            filename: r.filename,
            coverColor: r.cover_color,
            hasCover: false,
            progress: r.progress,
            available: false,
            backendId: r.id,
          }));
          setBooks(merged);
          if (merged.length > 0) setSelectedBookId(merged[0].id);
          setPageState('library');
        }}
      />
    );
  }

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
                selected={book.id === selectedBookId}
                onClick={() => book.available ? openBook(book.id) : handleLocateClick(book.id)}
              />
            ))}
          </div>
          {books.length === 0 && pageState !== 'loading' && (
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
              <input
                ref={locateInputRef}
                type="file"
                accept=".epub,application/epub+zip"
                onChange={onLocateFile}
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
                  onOpen={() => openBook(book.id)}
                  onLocate={() => handleLocateClick(book.id)}
                  onDelete={() => setDeletingBook(book)}
                />
              ))}
            </div>
          ) : pageState === 'loading' ? (
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

          {/* FS Access reconnect banner */}
          <div className="mt-4">
            <FsAccessBanner />
          </div>

          {/* Stats placeholder */}
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-lgc-border-strong px-5 py-5 text-[12px] text-lgc-fg-subtle">
            <Sparkles size={14} />
            <span>Reading stats · coming later</span>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ──────────────────────────────────────── */}
      {deletingBook && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setDeletingBook(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-lgc-border-strong bg-lgc-bg p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-red-500">
              <Trash2 size={16} />
              <h2 className="text-[15px] font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                Delete book
              </h2>
            </div>
            <p className="mb-1 text-[13px] text-lgc-fg-muted">
              Are you sure you want to delete <strong className="text-lgc-fg">{deletingBook.title}</strong>?
            </p>
            <p className="mb-5 text-[12px] text-lgc-fg-subtle">
              This will permanently remove all reading progress, bookmarks, and the local file from this device. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBook(null)}
                className="rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg transition-colors hover:bg-lgc-bg-sunken"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBook(deletingBook)}
                className="rounded-md bg-red-500 px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Onboarding explainer overlay ────────────────────────────────────── */}
      {showOnboarding && user && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg shadow-2xl">
            <OnboardingExplainer
              userId={user.id}
              onDismiss={() => setShowOnboarding(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
