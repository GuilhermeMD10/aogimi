'use client';

import { useEffect, useRef, useState } from 'react';
import type Book from 'epubjs/types/book';
import { TextReader } from '@/components/reader/TextReader';
import { NovelReader } from '@/components/reader/NovelReader';
import { MangaReader } from '@/components/reader/MangaReader';

// ── Props (same interface as before — nothing changes for consumers) ─────────

type Props = {
  fileUrl: string;
  filename: string;
  initialCfi?: string;
  onLookup: (word: string) => void;
  onAddCard: (word: string) => void;
  onProgressChange?: (progress: number, cfi: string) => void;
};

type ReaderType = 'text' | 'novel' | 'manga';

// ═════════════════════════════════════════════════════════════════════════════
// Router — loads the EPUB, detects type from metadata, renders sub-component
// ═════════════════════════════════════════════════════════════════════════════

export function EpubReader({
  fileUrl,
  filename,
  initialCfi,
  onLookup,
  onAddCard,
  onProgressChange,
}: Props) {
  const [book, setBook] = useState<Book | null>(null);
  const [readerType, setReaderType] = useState<ReaderType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bookRef = useRef<Book | null>(null);

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const [mod, buf] = await Promise.all([
          import('epubjs'),
          fetch(fileUrl).then((r) => r.arrayBuffer()),
        ]);
        if (dead) return;

        const b = (mod.default as (data: ArrayBuffer) => Book)(buf);
        bookRef.current = b;

        // Wait for metadata so we can detect the EPUB type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const loaded = (b as any).loaded;
        await Promise.all([loaded.metadata, loaded.displayOptions]);
        if (dead) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = (b as any).package?.metadata;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const displayOpts = (b as any).displayOptions;

        const isFxl =
          meta?.layout === 'pre-paginated' ||
          displayOpts?.fixedLayout === 'true';
        const isRtl = meta?.direction === 'rtl';

        let type: ReaderType = 'text';
        if (isFxl) type = 'manga';
        else if (isRtl) type = 'novel';

        setBook(b);
        setReaderType(type);
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      dead = true;
      try { bookRef.current?.destroy(); } catch { /* epubjs internal teardown */ }
      bookRef.current = null;
    };
  }, [fileUrl]);

  // ── Loading / error states ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="max-w-sm text-center text-sm text-lgc-error">
          EPUB load error: {error}
        </p>
      </div>
    );
  }

  if (!book || !readerType) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>
      </div>
    );
  }

  // ── Render the appropriate reader ───────────────────────────────────────

  const shared = { book, filename, initialCfi, onLookup, onAddCard, onProgressChange };

  switch (readerType) {
    case 'manga':
      return <MangaReader {...shared} />;
    case 'novel':
      return <NovelReader {...shared} />;
    default:
      return <TextReader {...shared} />;
  }
}
