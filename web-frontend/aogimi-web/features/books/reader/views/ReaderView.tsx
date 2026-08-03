'use client';

// `/reader/[bookId]` — one open book.
//
// This used to be state inside the library view, which meant a book couldn't be
// linked to and a refresh dropped you back on the shelf. It's a route now, so
// the id in the URL is the whole session: everything below is resolved from it.
//
// `bookId` is the IndexedDB key, which is the book's filename — the only id
// every *readable* book has, since a book with no local file can't be opened
// and a local-only book has no backend UUID.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { Button } from '@/shared/components';
import { EpubReader } from '@/features/books/reader/components/EpubReader';
import { PdfReader } from '@/features/books/reader/components/PdfReader';
import { useProgressSync, type ProgressTarget } from '@/features/books/reader/hooks/useProgressSync';
import { getAllBooks, getBookFile, ensureBackendBook } from '@/features/books/lib/bookStore';
import { getUserBooks } from '@/features/books/lib/booksApi';
import { getReaderProgress } from '@/features/books/lib/readerSession';
import type { BookProgressRecord } from '@/features/books/types';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { useReaderActions } from '@/features/app-shell/hooks/useReaderActions';
import DictSidebar from '@/features/books/reader/dict-sidebar';

/** Everything the readers need, resolved once from the id in the URL. */
type OpenBook = {
  title: string;
  author: string;
  filename: string;
  fileUrl: string;
  isPdf: boolean;
  backendBookId?: string;
  initialCfi: string | null;
  initialSpineIndex: number | null;
};

type Status =
  | { phase: 'opening' }
  /** The id resolved to no local file — a deep link to a book this device
   *  doesn't hold, which was unreachable before the reader had a URL. */
  | { phase: 'missing' }
  | { phase: 'failed'; message: string }
  | { phase: 'open'; book: OpenBook };

export default function ReaderView({ bookId }: { bookId: string }) {
  const user = useAuthedUser();
  const router = useRouter();
  const { sidekickOpen, toggleSidekick, setSidekickOpen } = useReaderState();
  const { requestDictLookup, requestAddCard } = useReaderActions();

  const [status, setStatus] = useState<Status>({ phase: 'opening' });

  // Memoised on the two fields it carries, not rebuilt per render: a fresh
  // object each time would re-run `useProgressSync`'s effect on every render,
  // and that effect resets the dedup seed — which is what stops opening a book
  // from writing its restored position straight back.
  const filename = status.phase === 'open' ? status.book.filename : null;
  const backendBookId = status.phase === 'open' ? status.book.backendBookId : undefined;
  const target = useMemo<ProgressTarget | null>(
    () => (filename ? { filename, backendBookId } : null),
    [filename, backendBookId],
  );
  const { recordProgress } = useProgressSync(target);

  // Resolve the book: local record → bytes → blob URL → restore anchor. The
  // blob URL is revoked by this effect's own cleanup, so it's tied to the
  // lifetime of the id rather than tracked in a ref.
  //
  // setState in an effect is the point here: this synchronises React with
  // IndexedDB and the network, neither of which can be read during render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let dead = false;
    let createdUrl: string | null = null;
    setStatus({ phase: 'opening' });

    (async () => {
      try {
        const local = (await getAllBooks()).find((b) => b.id === bookId);
        if (dead) return;
        if (!local) {
          setStatus({ phase: 'missing' });
          return;
        }

        const bytes = await getBookFile(local.id);
        if (dead) return;
        if (!bytes) {
          setStatus({ phase: 'missing' });
          return;
        }

        const isPdf = local.filename.toLowerCase().endsWith('.pdf');
        const mime = isPdf ? 'application/pdf' : 'application/epub+zip';
        createdUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));

        // Best-effort registration. Without a backend id the session still
        // opens — `useProgressSync` just keeps to the localStorage buffer.
        let record: BookProgressRecord | undefined;
        try {
          const remote = await getUserBooks(user.id);
          record = remote.find((b) => b.filename === local.filename);
          if (!record) record = await ensureBackendBook(local, user.id);
        } catch {
          /* backend unavailable */
        }
        if (dead) return;

        // Restore anchor: whichever of the local snapshot and the backend row
        // is newer. Same device ⇒ local; switched device ⇒ backend. Manga
        // carries no CFI, so spine index is what the fixed-layout reader uses.
        const snapshot = getReaderProgress(local.filename);
        const remoteAt = record?.last_read_at ? Date.parse(record.last_read_at) : 0;
        const useLocal = snapshot != null && snapshot.updatedAt >= remoteAt;

        setStatus({
          phase: 'open',
          book: {
            title: local.title,
            author: local.author,
            filename: local.filename,
            fileUrl: createdUrl,
            isPdf,
            backendBookId: record?.id,
            initialCfi: useLocal ? (snapshot?.cfi ?? null) : (record?.cfi_position ?? null),
            initialSpineIndex: useLocal
              ? (snapshot?.spineIndex ?? null)
              : (record?.spine_index ?? null),
          },
        });
      } catch (err) {
        if (!dead) {
          setStatus({ phase: 'failed', message: err instanceof Error ? err.message : String(err) });
        }
      }
    })();

    return () => {
      dead = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [bookId, user.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const goBack = useCallback(() => router.push('/reader'), [router]);

  const handleLookup = useCallback(
    (word: string, contextSentence?: string) => requestDictLookup(word, contextSentence),
    [requestDictLookup],
  );
  const handleAddCard = useCallback(
    (word: string, contextSentence?: string) => requestAddCard(word, undefined, contextSentence),
    [requestAddCard],
  );

  if (status.phase === 'opening') {
    return (
      <div className="flex h-full items-center justify-center font-[family-name:var(--face-ui)]">
        <p className="text-[13.5px] text-(--muted)">Opening&hellip;</p>
      </div>
    );
  }

  if (status.phase === 'missing' || status.phase === 'failed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center font-[family-name:var(--face-ui)]">
        <BookOpen size={28} strokeWidth={1.7} className="text-(--faint)" />
        <div>
          <p className="text-[15.5px] font-bold text-(--ink)">
            {status.phase === 'missing' ? "This book isn't on this device" : "This book couldn't be opened"}
          </p>
          <p className="mt-1 max-w-sm text-[13.5px] text-(--muted)">
            {status.phase === 'missing'
              ? 'Aogimi keeps your progress, not your files. Re-add the file from your library to open it where you left off.'
              : status.message}
          </p>
        </div>
        <Button href="/reader" variant="secondary">
          Back to library
        </Button>
      </div>
    );
  }

  const { book } = status;

  return (
    <div className="flex h-full min-h-0 flex-row">
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {book.isPdf ? (
          <PdfReader
            fileUrl={book.fileUrl}
            bookTitle={book.title}
            bookAuthor={book.author}
            onBack={goBack}
          />
        ) : (
          <EpubReader
            fileUrl={book.fileUrl}
            bookTitle={book.title}
            bookAuthor={book.author}
            onLookup={handleLookup}
            onAddCard={handleAddCard}
            onBack={goBack}
            sidekickOpen={sidekickOpen}
            onToggleSidekick={toggleSidekick}
            initialCfi={book.initialCfi}
            initialSpineIndex={book.initialSpineIndex}
            onRelocate={recordProgress}
          />
        )}
      </div>

      {sidekickOpen && (
        <aside
          aria-label="Dictionary"
          style={{ width: '25%', minWidth: 320, maxWidth: 480, flexShrink: 0 }}
        >
          <DictSidebar onClose={() => setSidekickOpen(false)} />
        </aside>
      )}
    </div>
  );
}
