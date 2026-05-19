'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EpubReader } from '@/components/reader/EpubReader';
import { PdfReader } from '@/components/reader/PdfReader';
import { DictionarySidekick } from '@/components/views/DictionaryView/DictionarySidekick';
import {
  getAllBooks,
  getBookFile,
  importBook,
  ensureBackendBook,
  syncLocalBooksToBackend,
  deleteBook as deleteLocalBook,
  renameBook as renameLocalBook,
} from '@/lib/bookStore';
import { matchBooks, deleteBookRecord, getUserBooks, updateBookTitle as apiUpdateBookTitle, updateBookProgress } from '@/lib/booksApi';
import { computeEpubIdentity } from '@/lib/epubIdentity';
import { computePdfIdentity } from '@/lib/pdfIdentity';
import { getDeviceId } from '@/lib/storage/device';
import { markBookAvailable } from '@/lib/devicesApi';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState, type ReaderSession } from '@/components/providers/ReaderStateProvider';
import type { LibraryBook } from '@/components/library/BookList';
import { LibraryDesk } from '@/components/library/LibraryDesk';
import RestoreLibrary from '@/components/library/RestoreLibrary';
import FsAccessBanner from '@/components/library/FsAccessBanner';
import OnboardingExplainerModal from '@/components/OnboardingExplainerModal';
import { getNeedsOnboarding } from '@/lib/storage/onboarding';
import { useLibraryModals } from '@/components/views/ReaderView/useLibraryModals';
import { useSyncLibrary } from '@/components/views/ReaderView/useSyncLibrary';

const MAX_EPUB_SIZE = 50 * 1024 * 1024;
const MAX_PDF_SIZE = 500 * 1024 * 1024;

function validateBookFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const isEpub = file.type === 'application/epub+zip' || name.endsWith('.epub');
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  if (!isEpub && !isPdf)
    return 'Invalid file type. Please upload an EPUB or PDF file.';
  if (isEpub && file.size > MAX_EPUB_SIZE)
    return 'EPUB too large. Maximum size is 50 MB.';
  if (isPdf && file.size > MAX_PDF_SIZE)
    return 'PDF too large. Maximum size is 500 MB.';
  return null;
}

export default function ReaderView() {
  const { user } = useAuth();
  const {
    setPendingDictSearch, setPendingCard,
    readerSession, setReaderSession,
    recordProgress, flushProgress,
    pendingBookOpen, setPendingBookOpen,
    sidekickOpen, toggleSidekick, setSidekickOpen,
  } = useReaderState();

  const { pageState, setPageState, books, setBooks, remoteBooks, error, setError } =
    useSyncLibrary(user ?? null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locateInputRef = useRef<HTMLInputElement>(null);
  const {
    locatingBookId, setLocatingBookId,
    showOnboarding, setShowOnboarding,
    deletingBook, setDeletingBook,
  } = useLibraryModals();

  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (readerSession?.fileUrl) {
      blobUrlRef.current = readerSession.fileUrl;
    }
  }, [readerSession?.fileUrl]);

  useEffect(() => {
    if (getNeedsOnboarding()) setShowOnboarding(true);
  }, []);

  const handleImport = useCallback(
    async (file: File) => {
      const validationError = validateBookFile(file);
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to import book: ${msg}`);
        console.error('Import failed', err);
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

  const onLocateFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !locatingBookId) return;
      e.target.value = '';

      const validationError = validateBookFile(file);
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
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const identity = isPdf
          ? await computePdfIdentity(arrayBuffer).catch(() => null)
          : await computeEpubIdentity(arrayBuffer).catch(() => null);

        const candidates = [{
          file_hash: identity?.fileHash ?? '',
          content_hash: identity?.contentHash ?? '',
          metadata: {
            title: '',
            author: '',
            dc_identifier: !isPdf && identity && 'dcIdentifier' in identity && typeof identity.dcIdentifier === 'string'
              ? identity.dcIdentifier
              : null,
            filename: file.name,
          },
        }];

        const results = await matchBooks(user.id, candidates);
        const match = results[0];

        const matchedBackendId = match?.match?.id;
        if (!match || matchedBackendId !== targetBook.backendId) {
          setError(
            `This file doesn’t match "${targetBook.title}". ` +
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

  const handleRenameBook = useCallback(
    async (book: LibraryBook, title: string) => {
      const trimmed = title.trim();
      if (!trimmed || trimmed === book.title) return;
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, title: trimmed } : b)));
      if (book.available) {
        await renameLocalBook(book.id, trimmed, book.backendId).catch(() => {});
      } else if (book.backendId) {
        await apiUpdateBookTitle(book.backendId, trimmed).catch(() => {});
      }
    },
    [],
  );

  const handleMarkFinished = useCallback(
    async (book: LibraryBook) => {
      if (book.progress === 100) return;
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, progress: 100 } : b)));
      if (book.backendId) {
        await updateBookProgress(book.backendId, { progress: 100 }).catch(() => {});
      }
    },
    [],
  );

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

        const mime = book.filename.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : 'application/epub+zip';
        const url = URL.createObjectURL(new Blob([arrayBuffer], { type: mime }));
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

  useEffect(() => {
    if (!pendingBookOpen) return;
    if (readerSession?.activeBook.filename === pendingBookOpen) {
      setPendingBookOpen(null);
      return;
    }
    if (pageState !== 'library') return;
    const target = books.find(b => b.filename === pendingBookOpen && b.available);
    if (!target) {
      setPendingBookOpen(null);
      return;
    }
    setPendingBookOpen(null);
    openBook(target.id);
  }, [pendingBookOpen, books, pageState, readerSession, openBook, setPendingBookOpen]);

  const goBack = useCallback(() => {
    flushProgress();

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setReaderSession(null);
    setError(null);
    getAllBooks()
      .then(allBooks => {
        setBooks(prev => {
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading book...</p>
      </div>
    );
  }

  if (readerSession) {
    const isPdf = readerSession.activeBook.filename.toLowerCase().endsWith('.pdf');
    return (
      <div className="flex h-full min-h-0 flex-row">
        <div className="flex h-full min-h-0 flex-1 flex-col">
          {isPdf ? (
            <PdfReader
              fileUrl={readerSession.fileUrl}
              bookTitle={readerSession.activeBook.title}
              initialCfi={readerSession.backendCfi ?? undefined}
              onProgressChange={recordProgress}
              onBack={goBack}
            />
          ) : (
            <EpubReader
              fileUrl={readerSession.fileUrl}
              filename={readerSession.activeBook.filename}
              bookTitle={readerSession.activeBook.title}
              initialCfi={readerSession.backendCfi ?? undefined}
              onLookup={handleLookup}
              onAddCard={handleAddCard}
              onProgressChange={handleProgressChange}
              onBack={goBack}
              sidekickOpen={sidekickOpen}
              onToggleSidekick={toggleSidekick}
            />
          )}
        </div>
        {sidekickOpen && (
          <aside
            aria-label="Dictionary"
            style={{ width: '25%', minWidth: 320, maxWidth: 480, flexShrink: 0 }}
          >
            <DictionarySidekick onClose={() => setSidekickOpen(false)} />
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {error && (
        <div className="mx-auto mt-4 max-w-295 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700" style={{ width: 'calc(100% - 80px)' }}>
          {error}
        </div>
      )}

      {pageState === 'loading' ? (
        <div className="flex h-full items-center justify-center text-sm text-lgc-fg-muted">
          Loading library…
        </div>
      ) : (
        <LibraryDesk
          books={books}
          importing={importing}
          onOpen={(book) => (book.available ? openBook(book.id) : handleLocateClick(book.id))}
          onImport={() => fileInputRef.current?.click()}
          onRename={(book, title) => handleRenameBook(book, title)}
          onMarkFinished={(book) => handleMarkFinished(book)}
          onRemove={(book) => setDeletingBook(book)}
          onLocate={(book) => handleLocateClick(book.id)}
          footer={<FsAccessBanner />}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf,application/epub+zip,application/pdf"
        onChange={onFileChange}
        className="hidden"
      />
      <input
        ref={locateInputRef}
        type="file"
        accept=".epub,.pdf,application/epub+zip,application/pdf"
        onChange={onLocateFile}
        className="hidden"
      />

      {deletingBook && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setDeletingBook(null)} />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-lgc-border-strong bg-lgc-bg p-6 shadow-2xl"
            style={{
              borderWidth: 2,
              borderColor: 'var(--lgc-fg)',
              boxShadow: '6px 6px 0 var(--lgc-fg)',
            }}
          >
            <div className="mb-1 flex items-center gap-2 text-red-500">
              <Trash2 size={16} />
              <h2 className="text-[15px] font-medium font-display">
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

      {showOnboarding && user && (
        <OnboardingExplainerModal
          userId={user.id}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
