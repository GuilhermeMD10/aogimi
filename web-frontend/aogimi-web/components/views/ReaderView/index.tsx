'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EpubReader } from '@/components/reader/EpubReader';
import { PdfReader } from '@/components/reader/PdfReader';
import { DictionarySidekick } from '@/features/dictionary';
import { getAllBooks, getBookFile, ensureBackendBook, renameBook as renameLocalBook } from '@/components/books/utils/bookStore';
import { getUserBooks, updateBookTitle as apiUpdateBookTitle, updateBookProgress } from '@/components/books/utils/booksApi';
import { deleteBookEverywhere } from '@/components/books/utils/deleteBook';
import { locateAndAttachFile, validateBookFile } from '@/components/books/utils/locateAndAttachFile';
import { importBookWithMatch } from '@/components/books/utils/importBookWithMatch';
import { reconcileBooks, syncPending } from '@/components/books/utils/reconcileBooks';
import { useAuthedUser } from '@/components/providers/useAuthedUser';
import { useReaderState, type ReaderSession } from '@/components/providers/ReaderStateProvider';
import { useReaderActions } from '@/components/providers/useReaderActions';
import { useProgressSync } from './useProgressSync';
import { getReaderProgress } from '@/lib/storage/readerSession';
import type { Book } from '@/components/books/types';
import type { BookProgressRecord } from '@/features/books/types';
import { BooksDesk } from '@/components/books/ui/BooksDesk';
import RestoreBooks from '@/components/books/ui/RestoreBooks';
import FsAccessBanner from '@/components/books/ui/FsAccessBanner';
import OnboardingExplainerModal from '@/components/OnboardingExplainerModal';
import { getUserProfile } from '@/lib/userApi';
import { useSyncBooks } from '@/components/books/hooks/useSyncBooks';

export default function ReaderView() {
  const user = useAuthedUser();
  const {
    readerSession,
    setReaderSession,
    pendingBookOpen,
    setPendingBookOpen,
    sidekickOpen,
    toggleSidekick,
    setSidekickOpen,
  } = useReaderState();
  const { requestDictLookup, requestAddCard } = useReaderActions();

  // Reading-position persistence for the active session. `recordProgress` is
  // handed to the reader and fired on every page turn; the hook buffers it to
  // localStorage and flushes to the backend periodically / on exit.
  const { recordProgress } = useProgressSync(readerSession);

  const { pageState, setPageState, books, setBooks, remoteBooks, error, setError } = useSyncBooks(user);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  /** Transient success/info banner shown next to / instead of error. Cleared
   *  by the next user action that interacts with the library. */
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locateInputRef = useRef<HTMLInputElement>(null);
  const [locatingBookId, setLocatingBookId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (readerSession?.fileUrl) {
      blobUrlRef.current = readerSession.fileUrl;
    }
  }, [readerSession?.fileUrl]);

  // Onboarding is gated on the backend `onboarding_completed` flag (set by
  // the modal's "Got it" via markOnboardingCompleted). New accounts default
  // to false, so they see it once; it then follows the user across devices.
  useEffect(() => {
    const controller = new AbortController();
    getUserProfile(user.id, controller.signal)
      .then((p) => { if (!p.onboarding_completed) setShowOnboarding(true); })
      .catch(() => { /* signed-out / offline — skip the gate */ });
    return () => controller.abort();
  }, [user.id]);

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      // Pass 1: orphan + stale wipe (pending books are skipped).
      const reconcileSummary = await reconcileBooks(user.id);
      // Pass 2: push every locally-pending book.
      const pushSummary = await syncPending(user.id);

      const total =
        reconcileSummary.staleReplaced.length +
        reconcileSummary.syncedUp.length +
        pushSummary.pushed.length +
        pushSummary.failed.length;
      if (total === 0) {
        setNotice('Library is up to date.');
      } else {
        const parts: string[] = [];
        if (reconcileSummary.staleReplaced.length > 0) {
          parts.push(`${reconcileSummary.staleReplaced.length} replaced — re-locate to view the new bytes`);
        }
        if (pushSummary.pushed.length > 0) {
          parts.push(`${pushSummary.pushed.length} pushed to cloud`);
        }
        if (pushSummary.failed.length > 0) {
          parts.push(`${pushSummary.failed.length} couldn't push — try again`);
        }
        if (reconcileSummary.syncedUp.length > 0) {
          parts.push(`${reconcileSummary.syncedUp.length} backfilled with local fingerprint`);
        }
        setNotice(`Synced: ${parts.join(' · ')}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Sync failed: ${msg}`);
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, setError]);

  const handleImport = useCallback(
    async (file: File) => {
      const validationError = validateBookFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setImporting(true);
      setError(null);
      setNotice(null);
      try {
        const result = await importBookWithMatch(file, user.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        const { record } = result;
        if (result.wasAlreadyPresentSameBytes) {
          setNotice(`Already in your library: "${record.title}" — same bytes were already imported on this device.`);
        }
        const newBook: Book = {
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
        // Replace existing tile (when we attached to a known register) or
        // append (when this is a brand-new entry).
        setBooks((prev) => {
          const idx = prev.findIndex((b) => b.filename === newBook.filename);
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = { ...prev[idx], ...newBook };
            return next;
          }
          return [...prev, newBook];
        });
      } finally {
        setImporting(false);
      }
    },
    [user, setBooks, setError],
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

      const targetBook = books.find((b) => b.id === locatingBookId);
      if (!targetBook?.backendId) {
        setLocatingBookId(null);
        return;
      }

      const result = await locateAndAttachFile({
        file,
        userId: user.id,
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

      setBooks((prev) =>
        prev.map((b) =>
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
    [locatingBookId, user, books, setBooks, setError],
  );

  const handleLocateClick = useCallback((bookId: string) => {
    setLocatingBookId(bookId);
    locateInputRef.current?.click();
  }, []);

  const handleDeleteBook = useCallback(async (book: Book) => {
    setError(null);
    try {
      await deleteBookEverywhere(book);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      setDeletingBook(null);
    } catch {
      setError('Failed to delete book');
    }
  }, []);

  const handleMarkFinished = useCallback(async (book: Book) => {
    if (book.progress === 100) return;
    setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, progress: 100 } : b)));
    if (book.backendId) {
      await updateBookProgress(book.backendId, { progress: 100 }).catch(() => {});
    }
  }, []);

  const handleRenameBook = useCallback(async (book: Book, title: string) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === book.title) return;
    setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, title: trimmed } : b)));
    if (book.available) {
      await renameLocalBook(book.id, trimmed, book.backendId).catch(() => {});
    } else if (book.backendId) {
      await apiUpdateBookTitle(book.backendId, trimmed).catch(() => {});
    }
  }, []);

  const openBook = useCallback(
    async (bookId: string) => {
      const allBooks = await getAllBooks();
      const book = allBooks.find((b) => b.id === bookId);
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

        const mime = book.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip';
        const url = URL.createObjectURL(new Blob([arrayBuffer], { type: mime }));
        blobUrlRef.current = url;

        // Resolve the backend book id + ensure registration. Best-effort —
        // if the backend is unreachable the session opens local-only (no id
        // ⇒ useProgressSync writes localStorage but doesn't sync this run).
        let backendRecord: BookProgressRecord | undefined;
        try {
          const remote = await getUserBooks(user.id);
          backendRecord = remote.find((b) => b.filename === book.filename);
          if (!backendRecord) backendRecord = await ensureBackendBook(book, user.id);
        } catch {
          /* backend unavailable */
        }

        // Restore anchor: take the newer of the local snapshot and the backend
        // row (same device ⇒ local; switched device ⇒ backend). Manga carries
        // no CFI, so spine index is the fallback the fixed-layout reader uses.
        const local = getReaderProgress(book.filename);
        const backendUpdatedAt = backendRecord?.last_read_at ? Date.parse(backendRecord.last_read_at) : 0;
        const useLocal = local != null && local.updatedAt >= backendUpdatedAt;
        const initialCfi = useLocal ? (local!.cfi || null) : (backendRecord?.cfi_position ?? null);
        const initialSpineIndex = useLocal ? (local!.spineIndex ?? null) : (backendRecord?.spine_index ?? null);

        const session: ReaderSession = {
          activeBook: book,
          fileUrl: url,
          backendBookId: backendRecord?.id,
          initialCfi,
          initialSpineIndex,
        };
        setReaderSession(session);
        setLoading(false);
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
    const target = books.find((b) => b.filename === pendingBookOpen && b.available);
    if (!target) {
      setPendingBookOpen(null);
      return;
    }
    setPendingBookOpen(null);
    openBook(target.id);
  }, [pendingBookOpen, books, pageState, readerSession, openBook, setPendingBookOpen]);

  const goBack = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setReaderSession(null);
    setError(null);
    getAllBooks()
      .then((allBooks) => {
        setBooks((prev) => {
          const localMap = new Map(allBooks.map((b) => [b.filename, b]));
          return prev.map((b) => {
            const local = localMap.get(b.filename);
            if (local) {
              return { ...b, id: local.id, hasCover: local.hasCover, coverImage: local.coverImage, available: true };
            }
            return b;
          });
        });
      })
      .catch(() => {});
  }, [setReaderSession, setBooks, setError]);

  const handleLookup = useCallback(
    (word: string, contextSentence?: string) => {
      requestDictLookup(word, contextSentence);
    },
    [requestDictLookup],
  );

  const handleAddCard = useCallback(
    (word: string, contextSentence?: string) => {
      requestAddCard(word, undefined, contextSentence);
    },
    [requestAddCard],
  );

  // Both "Go to library" and "Skip for now" do the same thing: drop
  // the user into the library with cloud registers rendered as
  // unavailable tiles. They can locate files later from the library
  // itself. No reload — useSyncBooks routes off local-vs-remote book
  // state, so a reload would just bounce back to the restore screen.
  const handleRestoreComplete = useCallback(() => {
    setBooks(
      remoteBooks.map((r) => ({
        id: r.id,
        title: r.title,
        author: r.author,
        filename: r.filename,
        coverColor: r.cover_color,
        hasCover: false,
        progress: r.progress,
        available: false,
        backendId: r.id,
        lastReadAt: r.last_read_at,
      })),
    );
    setPageState('library');
  }, [remoteBooks, setBooks, setPageState]);

  if (pageState === 'restore' && !readerSession) {
    return (
      <RestoreBooks
        remoteBooks={remoteBooks}
        userId={user.id}
        onComplete={handleRestoreComplete}
        onSkip={handleRestoreComplete}
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
              onBack={goBack}
            />
          ) : (
            <EpubReader
              fileUrl={readerSession.fileUrl}
              bookTitle={readerSession.activeBook.title}
              onLookup={handleLookup}
              onAddCard={handleAddCard}
              onBack={goBack}
              sidekickOpen={sidekickOpen}
              onToggleSidekick={toggleSidekick}
              initialCfi={readerSession.initialCfi}
              initialSpineIndex={readerSession.initialSpineIndex}
              onRelocate={recordProgress}
            />
          )}
        </div>
        {sidekickOpen && (
          <aside aria-label="Dictionary" style={{ width: '25%', minWidth: 320, maxWidth: 480, flexShrink: 0 }}>
            <DictionarySidekick onClose={() => setSidekickOpen(false)} />
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      {error && (
        <div
          className="mx-auto mt-4 max-w-295 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-700"
          style={{ width: 'calc(100% - 80px)' }}
        >
          {error}
        </div>
      )}
      {notice && !error && (
        <div
          className="mx-auto mt-4 max-w-295 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] text-emerald-800"
          style={{ width: 'calc(100% - 80px)' }}
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded px-2 py-0.5 text-[12px] text-emerald-800 hover:bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="mx-auto mt-3 max-w-295 flex justify-end" style={{ width: 'calc(100% - 80px)' }}>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="rounded-md border border-lgc-border bg-lgc-bg-elev px-3 py-1 text-[12px] text-lgc-fg hover:bg-lgc-bg-hover disabled:opacity-55"
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {pageState === 'loading' ? (
        <div className="flex h-full items-center justify-center text-sm text-lgc-fg-muted">Loading library…</div>
      ) : (
        <BooksDesk
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
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-lgc-border-strong bg-lgc-bg p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-red-500">
              <Trash2 size={16} />
              <h2 className="text-[15px] font-medium font-display">Delete book</h2>
            </div>
            <p className="mb-1 text-[13px] text-lgc-fg-muted">
              Are you sure you want to delete <strong className="text-lgc-fg">{deletingBook.title}</strong>?
            </p>
            <p className="mb-5 text-[12px] text-lgc-fg-subtle">
              This will permanently remove this book and its local file from this device. This action cannot be undone.
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

      {showOnboarding && <OnboardingExplainerModal userId={user.id} onDismiss={() => setShowOnboarding(false)} />}
    </div>
  );
}
