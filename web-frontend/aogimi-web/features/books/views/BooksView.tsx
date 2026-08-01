'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { renameBook as renameLocalBook } from '@/features/books/lib/bookStore';
import { updateBookTitle as apiUpdateBookTitle, updateBookProgress } from '@/features/books/lib/booksApi';
import { deleteBookEverywhere } from '@/features/books/lib/deleteBook';
import { locateAndAttachFile, validateBookFile } from '@/features/books/lib/locateAndAttachFile';
import { importBookWithMatch } from '@/features/books/lib/importBookWithMatch';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import type { Book } from '@/features/books/types';
import { LibraryShelf, FsAccessBanner } from '@/features/books/library';
import OnboardingExplainerModal from '@/features/onboarding';
import { getUserProfile } from '@/features/profile/lib/userApi';
import { useSyncBooks } from '@/features/books/hooks/useSyncBooks';

export default function BooksView() {
  const user = useAuthedUser();
  const router = useRouter();

  const { pageState, books, setBooks, error, setError } = useSyncBooks(user);
  const [importing, setImporting] = useState(false);
  /** Transient success/info banner shown next to / instead of error. Cleared
   *  by the next user action that interacts with the library. */
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locateInputRef = useRef<HTMLInputElement>(null);
  const [locatingBookId, setLocatingBookId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);

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

  // Opening a book is a navigation now, not a state flip: the reader owns the
  // file, the restore anchor and the progress sync, keyed off the id in its URL.
  const openBook = useCallback(
    (book: Book) => router.push(`/reader/${encodeURIComponent(book.id)}`),
    [router],
  );

  return (
    <div className="relative h-full overflow-hidden">
      <LibraryShelf
        books={books}
        loading={pageState === 'loading'}
        importing={importing}
        error={error}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        onImport={() => fileInputRef.current?.click()}
        onOpen={(book) => (book.available ? openBook(book) : handleLocateClick(book.id))}
        onLocate={(book) => handleLocateClick(book.id)}
        onRename={(book, title) => handleRenameBook(book, title)}
        onMarkFinished={(book) => handleMarkFinished(book)}
        onRemove={(book) => setDeletingBook(book)}
        footer={<FsAccessBanner />}
      />

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
