'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getBook, getBookFile, ensureBackendBook, type BookRecord } from '@/lib/bookStore';
import { EpubReader } from '@/components/reader/EpubReader';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserBooks, updateBookProgress } from '@/lib/booksApi';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<LoadState>('loading');
  const [book, setBook] = useState<BookRecord | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [backendBookId, setBackendBookId] = useState<string | null>(null);
  const [backendCfi, setBackendCfi] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<{ progress: number; cfi: string } | null>(null);

  useEffect(() => {
    if (!bookId) return;

    const decodedId = decodeURIComponent(bookId);
    let cancelled = false;

    (async () => {
      try {
        const [record, arrayBuffer] = await Promise.all([
          getBook(decodedId),
          getBookFile(decodedId),
        ]);

        if (cancelled) return;

        if (!record || !arrayBuffer) {
          setState('not-found');
          return;
        }

        const blob = new Blob([arrayBuffer], { type: 'application/epub+zip' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        setBook(record);
        setFileUrl(url);
        setState('ready');

        // Resolve or create backend record for progress sync
        if (user) {
          try {
            // First try to find existing record
            const remote = await getUserBooks(user.id);
            const match = remote.find((b) => b.filename === record.filename);
            if (match) {
              setBackendBookId(match.id);
              if (match.cfi_position) setBackendCfi(match.cfi_position);
            } else {
              // Not found — register the book now
              const created = await ensureBackendBook(record, user.id);
              setBackendBookId(created.id);
            }
          } catch {
            // Backend unavailable — reading still works, just no sync
          }
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [bookId, user]);

  // Progress handler: localStorage on every page turn, backend debounced
  const handleProgressChange = useCallback(
    (progress: number, cfi: string) => {
      // Always save to localStorage immediately so it persists across refreshes
      if (book) {
        try {
          localStorage.setItem(
            `reader_progress_${book.filename}`,
            JSON.stringify({ progress, cfi, updatedAt: Date.now() }),
          );
        } catch { /* quota exceeded */ }
      }

      // Backend sync: skip if no backend ID or nothing changed
      if (!backendBookId) return;
      const last = lastSyncedRef.current;
      if (last && last.progress === progress && last.cfi === cfi) return;

      const doSync = () => {
        lastSyncedRef.current = { progress, cfi };
        updateBookProgress(backendBookId, {
          cfiPosition: cfi,
          progress,
        }).catch(() => {
          // Sync failure is non-critical
        });
      };

      // First sync fires immediately
      if (!lastSyncedRef.current) {
        doSync();
        return;
      }

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(doSync, 2000);
    },
    [backendBookId, book],
  );

  const handleLookup = useCallback(
    (word: string) => {
      router.push(`/dictionary?q=${encodeURIComponent(word)}`);
    },
    [router],
  );

  const handleAddCard = useCallback(
    (word: string) => {
      router.push(`/cards?add=${encodeURIComponent(word)}`);
    },
    [router],
  );

  if (state === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading book...</p>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-lgc-fg-muted">Book not found</p>
        <button
          type="button"
          onClick={() => router.push('/library')}
          className="flex items-center gap-1.5 text-sm text-lgc-accent hover:underline"
        >
          <ArrowLeft size={14} /> Back to library
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-lgc-fg-muted">
          Failed to load book
        </p>
        <button
          type="button"
          onClick={() => router.push('/library')}
          className="flex items-center gap-1.5 text-sm text-lgc-accent hover:underline"
        >
          <ArrowLeft size={14} /> Back to library
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-lgc-border/50 bg-lgc-bg/80 px-3 py-1.5 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => router.push('/library')}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
        >
          <ArrowLeft size={14} />
          <span>Library</span>
        </button>
        {book && (
          <span
            className="truncate text-[13px] text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {book.title}
          </span>
        )}
      </div>

      {/* Reader */}
      <div className="min-h-0 flex-1">
        {fileUrl && book && (
          <EpubReader
            fileUrl={fileUrl}
            filename={book.filename}
            initialCfi={backendCfi ?? undefined}
            onLookup={handleLookup}
            onAddCard={handleAddCard}
            onProgressChange={handleProgressChange}
          />
        )}
      </div>
    </div>
  );
}
