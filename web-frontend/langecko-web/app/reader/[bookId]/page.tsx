'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getBook, getBookFile, ensureBackendBook, type BookRecord } from '@/lib/bookStore';
import { EpubReader } from '@/components/reader/EpubReader';
import { useAuth } from '@/components/providers/AuthProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { getUserBooks, updateBookProgress, sendProgressBeacon, type ProgressPayload } from '@/lib/booksApi';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { setPendingDictSearch, setPendingCard } = useReaderState();

  const [state, setState] = useState<LoadState>('loading');
  const [book, setBook] = useState<BookRecord | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [backendBookId, setBackendBookId] = useState<string | null>(null);
  const [backendCfi, setBackendCfi] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Progress sync refs — no debounce timer, only exit-event flush
  const latestRef = useRef<ProgressPayload | null>(null);
  const lastSyncedRef = useRef<{ progress: number; cfi: string } | null>(null);
  const backendIdRef = useRef<string | null>(null);
  backendIdRef.current = backendBookId;
  const bookRef = useRef<BookRecord | null>(null);
  bookRef.current = book;

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
            const remote = await getUserBooks(user.id);
            const match = remote.find((b) => b.filename === record.filename);
            if (match) {
              setBackendBookId(match.id);
              if (match.cfi_position) setBackendCfi(match.cfi_position);
            } else {
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
    };
  }, [bookId, user]);

  // ── Progress flush helpers ────────────────────────────────────────────────

  const flushViaFetch = useCallback(() => {
    const id = backendIdRef.current;
    const latest = latestRef.current;
    if (!id || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfiPosition) return;

    lastSyncedRef.current = { progress: latest.progress ?? 0, cfi: latest.cfiPosition ?? '' };
    updateBookProgress(id, latest).catch(() => {});
  }, []);

  const flushViaBeacon = useCallback(() => {
    const id = backendIdRef.current;
    const latest = latestRef.current;
    if (!id || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfiPosition) return;

    lastSyncedRef.current = { progress: latest.progress ?? 0, cfi: latest.cfiPosition ?? '' };
    sendProgressBeacon(id, latest);
  }, []);

  // ── Exit-event listeners ──────────────────────────────────────────────────

  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') flushViaFetch();
    };
    const onPageHide = () => flushViaBeacon();

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushViaFetch, flushViaBeacon]);

  // ── Progress handler: localStorage on every turn, backend on exit only ────

  const handleProgressChange = useCallback(
    (progress: number, cfi: string) => {
      const payload: ProgressPayload = { cfiPosition: cfi, progress };
      latestRef.current = payload;

      if (bookRef.current) {
        try {
          localStorage.setItem(
            `reader_progress_${bookRef.current.filename}`,
            JSON.stringify({ progress, cfi, updatedAt: Date.now() }),
          );
        } catch { /* quota exceeded */ }
      }
    },
    [],
  );

  const handleLookup = useCallback(
    (word: string) => {
      setPendingDictSearch(word);
      router.push('/modular');
    },
    [setPendingDictSearch, router],
  );

  const handleAddCard = useCallback(
    (word: string) => {
      setPendingCard({ word });
      router.push('/modular');
    },
    [setPendingCard, router],
  );

  const goBackToLibrary = useCallback(() => {
    flushViaFetch();
    router.push('/library');
  }, [flushViaFetch, router]);

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
          onClick={goBackToLibrary}
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
