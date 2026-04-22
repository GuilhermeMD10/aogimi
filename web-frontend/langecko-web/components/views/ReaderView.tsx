'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ArrowLeft,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { EpubReader } from '@/components/reader/EpubReader';
import {
  getAllBooks,
  getBookFile,
  importBook,
  ensureBackendBook,
  syncLocalBooksToBackend,
  backfillBookIdentity,
  deleteBook as deleteLocalBook,
} from '@/lib/bookStore';
import { matchBooks, deleteBookRecord, getUserBooks, type BookProgressRecord } from '@/lib/booksApi';
import { computeEpubIdentity } from '@/lib/epubIdentity';
import { getDeviceId, getDeviceName } from '@/lib/deviceId';
import {
  registerDevice,
  getDeviceBooks,
  markBookAvailable,
  type DeviceBookRecord,
} from '@/lib/devicesApi';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState, type ReaderSession } from '@/components/providers/ReaderStateProvider';
import { BookTableRow, type LibraryBook } from '@/components/library/BookList';
import RestoreLibrary from '@/components/library/RestoreLibrary';
import FsAccessBanner from '@/components/library/FsAccessBanner';
import OnboardingExplainer from '@/components/onboarding/OnboardingExplainer';

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_EPUB_SIZE = 50 * 1024 * 1024;

type PageState = 'loading' | 'restore' | 'library';

function validateEpub(file: File): string | null {
  if (file.type !== 'application/epub+zip' && !file.name.endsWith('.epub'))
    return 'Invalid file type. Please upload an EPUB file.';
  if (file.size > MAX_EPUB_SIZE)
    return 'File too large. Maximum size is 50 MB.';
  return null;
}

// ── ReaderView ──────────────────────────────────────────────────────────────

export default function ReaderView() {
  const { user } = useAuth();
  const { setPendingDictSearch, setPendingCard, readerSession, setReaderSession, recordProgress, flushProgress } =
    useReaderState();

  // Library state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [remoteBooks, setRemoteBooks] = useState<DeviceBookRecord[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locateInputRef = useRef<HTMLInputElement>(null);
  const [locatingBookId, setLocatingBookId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deletingBook, setDeletingBook] = useState<LibraryBook | null>(null);

  // Reader state
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Track active blob URL
  useEffect(() => {
    if (readerSession?.fileUrl) {
      blobUrlRef.current = readerSession.fileUrl;
    }
  }, [readerSession?.fileUrl]);

  // Check onboarding flag
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
          setPageState('library');
          return;
        }

        // Register this device
        const deviceId = getDeviceId();
        const deviceName = getDeviceName();
        try {
          await registerDevice(user.id, deviceId, deviceName);
        } catch { /* best-effort */ }

        // Sync local books to backend
        let backendMap = new Map<string, BookProgressRecord>();
        try {
          backendMap = await syncLocalBooksToBackend(user.id);
        } catch { /* backend unavailable */ }
        if (cancelled) return;

        // Mark local books as available on this device
        const localFilenames = new Set(localBooks.map(b => b.filename));
        for (const [filename, remote] of backendMap) {
          if (localFilenames.has(filename)) {
            markBookAvailable(deviceId, remote.id, user.id).catch(() => {});
          }
        }

        // Fetch device-aware book list
        let deviceBooks: DeviceBookRecord[] = [];
        try {
          deviceBooks = await getDeviceBooks(deviceId, user.id);
        } catch {
          deviceBooks = Array.from(backendMap.values()).map(r => ({
            ...r,
            available: localFilenames.has(r.filename),
          }));
        }
        if (cancelled) return;
        setRemoteBooks(deviceBooks);

        // New device needing restore?
        if (localBooks.length === 0 && deviceBooks.length > 0) {
          setPageState('restore');
          return;
        }

        // Merge local + remote
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

  // ── Import ────────────────────────────────────────────────────────────────

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

        if (user) {
          const deviceId = getDeviceId();
          try {
            const backendMap = await syncLocalBooksToBackend(user.id);
            const remote = backendMap.get(record.filename);
            if (remote) {
              await markBookAvailable(deviceId, remote.id, user.id);
            }
          } catch { /* best-effort */ }
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

  // ── Locate file (unavailable book) ────────────────────────────────────────

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
        const arrayBuffer = await file.arrayBuffer();
        const identity = await computeEpubIdentity(arrayBuffer).catch(() => null);

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

        const matchedBackendId = match?.match?.id;
        if (!match || matchedBackendId !== targetBook.backendId) {
          setError(
            `This file doesn\u2019t match "${targetBook.title}". ` +
            (match ? `It matched a different book ("${match.match.title}").` : 'No matching book found.'),
          );
          setLocatingBookId(null);
          return;
        }

        const record = await importBook(file, user.id);
        const deviceId = getDeviceId();
        markBookAvailable(deviceId, targetBook.backendId!, user.id).catch(() => {});

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

  const handleLocateClick = useCallback((bookId: string) => {
    setLocatingBookId(bookId);
    locateInputRef.current?.click();
  }, []);

  // ── Delete book ───────────────────────────────────────────────────────────

  const handleDeleteBook = useCallback(
    async (book: LibraryBook) => {
      setError(null);
      try {
        if (book.backendId) {
          await deleteBookRecord(book.backendId).catch(() => {});
        }
        if (book.available) {
          await deleteLocalBook(book.id).catch(() => {});
        }
        setBooks(prev => prev.filter(b => b.id !== book.id));
        setDeletingBook(null);
      } catch {
        setError('Failed to delete book');
      }
    },
    [],
  );

  // ── Open book into reader ─────────────────────────────────────────────────

  const openBook = useCallback(
    async (bookId: string) => {
      const allBooks = await getAllBooks();
      const book = allBooks.find(b => b.id === bookId);
      if (!book) return;

      setLoading(true);
      setError(null);

      try {
        const arrayBuffer = await getBookFile(book.id);
        if (!arrayBuffer) {
          setError('File not found');
          setLoading(false);
          return;
        }

        if (blobUrlRef.current && blobUrlRef.current !== readerSession?.fileUrl) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/epub+zip' }));
        blobUrlRef.current = url;

        const session: ReaderSession = {
          activeBook: book,
          fileUrl: url,
          backendBookId: null,
          backendCfi: null,
        };
        setReaderSession(session);
        setLoading(false);

        if (user) {
          try {
            const remote = await getUserBooks(user.id);
            const match = remote.find((b) => b.filename === book.filename);
            if (match) {
              setReaderSession((prev) =>
                prev ? { ...prev, backendBookId: match.id, backendCfi: match.cfi_position } : prev,
              );
            } else {
              const created = await ensureBackendBook(book, user.id);
              setReaderSession((prev) => (prev ? { ...prev, backendBookId: created.id } : prev));
            }
          } catch { /* backend unavailable */ }
        }
      } catch {
        setError('Failed to load book');
        setLoading(false);
      }
    },
    [user, readerSession?.fileUrl, setReaderSession],
  );

  // ── Go back to book list ──────────────────────────────────────────────────

  const goBack = useCallback(() => {
    flushProgress();

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setReaderSession(null);
    setError(null);
    // Refresh book list
    getAllBooks()
      .then(allBooks => {
        setBooks(prev => {
          // Update available books with fresh local data, keep unavailable ones
          const localMap = new Map(allBooks.map(b => [b.filename, b]));
          return prev.map(b => {
            const local = localMap.get(b.filename);
            if (local) {
              return { ...b, id: local.id, hasCover: local.hasCover, coverImage: local.coverImage, available: true };
            }
            return b;
          });
        });
      })
      .catch(() => {});
  }, [flushProgress, setReaderSession]);

  // ── Reader callbacks ──────────────────────────────────────────────────────

  const handleProgressChange = useCallback(
    (progress: number, cfi: string) => {
      recordProgress({ progress, cfi, spineIndex: 0, totalSpineItems: 0 });
    },
    [recordProgress],
  );

  const handleLookup = useCallback(
    (word: string, contextSentence?: string) => { setPendingDictSearch({ word, contextSentence }); },
    [setPendingDictSearch],
  );

  const handleAddCard = useCallback(
    (word: string, contextSentence?: string) => { setPendingCard({ word, contextSentence }); },
    [setPendingCard],
  );

  // ── Restore flow ──────────────────────────────────────────────────────────

  const handleRestoreComplete = useCallback(() => {
    setPageState('loading');
    window.location.reload();
  }, []);

  if (pageState === 'restore' && !readerSession) {
    return (
      <RestoreLibrary
        remoteBooks={remoteBooks}
        userId={user!.id}
        onComplete={handleRestoreComplete}
        onSkip={() => {
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
          setPageState('library');
        }}
      />
    );
  }

  // ── Loading book ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading book...</p>
      </div>
    );
  }

  // ── Active reader ─────────────────────────────────────────────────────────

  if (readerSession) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-lgc-border px-3 py-1.5">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          >
            <ArrowLeft size={12} />
            Books
          </button>
          <span className="truncate text-[12px] text-lgc-fg" style={{ fontFamily: 'var(--font-display)' }}>
            {readerSession.activeBook.title}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <EpubReader
            fileUrl={readerSession.fileUrl}
            filename={readerSession.activeBook.filename}
            initialCfi={readerSession.backendCfi ?? undefined}
            onLookup={handleLookup}
            onAddCard={handleAddCard}
            onProgressChange={handleProgressChange}
          />
        </div>
      </div>
    );
  }

  // ── Library (no book open) ────────────────────────────────────────────────

  return (
    <div className="h-full overflow-auto" style={{ padding: '28px 36px' }}>
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
            <div
              className="grid border-b border-lgc-border px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-lgc-fg-muted"
              style={{ gridTemplateColumns: '32px 1fr 140px 36px' }}
            >
              <span />
              <span>Title</span>
              <span>Progress</span>
              <span />
            </div>
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
            <BookOpen size={32} className="mb-3 text-lgc-fg-subtle" />
            <p className="mb-1 text-sm font-medium text-lgc-fg">No books yet</p>
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
