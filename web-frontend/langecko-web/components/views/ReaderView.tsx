'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { EpubReader } from '@/components/reader/EpubReader';
import { getAllBooks, getBookFile, ensureBackendBook, type BookRecord } from '@/lib/bookStore';
import { getUserBooks } from '@/lib/booksApi';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState, type ReaderSession } from '@/components/providers/ReaderStateProvider';

export default function ReaderView() {
  const { user } = useAuth();
  const {
    setPendingDictSearch,
    setPendingCard,
    readerSession,
    setReaderSession,
    recordProgress,
    flushProgress,
  } = useReaderState();

  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blobUrlRef = useRef<string | null>(null);

  // If we have an active session from context, track its blob URL
  useEffect(() => {
    if (readerSession?.fileUrl) {
      blobUrlRef.current = readerSession.fileUrl;
    }
  }, [readerSession?.fileUrl]);

  // Load book list from IndexedDB
  useEffect(() => {
    getAllBooks().then(setBooks).catch(() => {});
  }, []);

  const openBook = useCallback(async (book: BookRecord) => {
    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await getBookFile(book.id);
      if (!arrayBuffer) { setError('File not found'); setLoading(false); return; }

      // Revoke previous blob URL if it exists and isn't part of an active session
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

      // Resolve backend record for progress sync
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
            setReaderSession((prev) =>
              prev ? { ...prev, backendBookId: created.id } : prev,
            );
          }
        } catch { /* backend unavailable — reading still works */ }
      }
    } catch {
      setError('Failed to load book');
      setLoading(false);
    }
  }, [user, readerSession?.fileUrl, setReaderSession]);

  const goBack = useCallback(() => {
    // Flush progress to backend before closing
    flushProgress();

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setReaderSession(null);
    setError(null);
    // Refresh book list
    getAllBooks().then(setBooks).catch(() => {});
  }, [flushProgress, setReaderSession]);

  const handleProgressChange = useCallback(
    (progress: number, cfi: string) => {
      recordProgress({ progress, cfi, spineIndex: 0, totalSpineItems: 0 });
    },
    [recordProgress],
  );

  const handleLookup = useCallback((word: string) => {
    setPendingDictSearch(word);
  }, [setPendingDictSearch]);

  const handleAddCard = useCallback((word: string) => {
    setPendingCard({ word });
  }, [setPendingCard]);

  // ── Picker ──────────────────────────────────────────────────────────────────
  if (!readerSession && !loading && !error) {
    if (books.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
          <BookOpen size={28} className="text-lgc-fg-subtle" />
          <p className="text-sm font-medium text-lgc-fg">No books yet</p>
          <p className="text-xs text-lgc-fg-muted">Import books from the Library page first</p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-lgc-border px-3 py-2">
          <BookOpen size={12} className="text-lgc-fg-muted" />
          <span className="text-[12px] font-semibold text-lgc-fg">Choose a book</span>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => openBook(book)}
                className="overflow-hidden rounded-lg border border-lgc-border bg-lgc-bg-elev text-left transition-shadow hover:shadow-md"
              >
                <div
                  className="relative h-12"
                  style={{ background: `linear-gradient(135deg, ${book.coverColor} 0%, color-mix(in oklab, ${book.coverColor} 50%, black) 100%)` }}
                >
                  {book.coverImage ? (
                    <img src={book.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span
                      className="absolute bottom-1 left-2 text-lg leading-none text-white/80"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {book.title.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[11px] font-medium text-lgc-fg" style={{ fontFamily: 'var(--font-display)' }}>
                    {book.title}
                  </p>
                  <p className="truncate text-[10px] text-lgc-fg-muted">{book.author}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading book...</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-lgc-fg-muted">{error}</p>
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-lgc-accent hover:underline"
        >
          <ArrowLeft size={14} /> Back to books
        </button>
      </div>
    );
  }

  // ── Reading ─────────────────────────────────────────────────────────────────
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
        {readerSession?.activeBook && (
          <span className="truncate text-[12px] text-lgc-fg" style={{ fontFamily: 'var(--font-display)' }}>
            {readerSession.activeBook.title}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {readerSession && (
          <EpubReader
            fileUrl={readerSession.fileUrl}
            filename={readerSession.activeBook.filename}
            initialCfi={readerSession.backendCfi ?? undefined}
            onLookup={handleLookup}
            onAddCard={handleAddCard}
            onProgressChange={handleProgressChange}
          />
        )}
      </div>
    </div>
  );
}
