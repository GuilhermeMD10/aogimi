'use client';

import { useEffect, useState } from 'react';
import { TextReader } from '@/components/reader/TextReader';
import { NovelReader } from '@/components/reader/NovelReader';
import { MangaReader } from '@/components/reader/MangaReader';
import { makeBookFromBlob } from '@/lib/foliate';

// ── Props (same interface as before — nothing changes for consumers) ─────────

type Props = {
  fileUrl: string;
  filename: string;
  bookTitle: string;
  initialCfi?: string;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onProgressChange?: (progress: number, cfi: string) => void;
  onBack: () => void;
  /** Whether the dictionary sidekick is currently docked. Reader toolbars use
   * this to render the toggle in its active state. */
  sidekickOpen?: boolean;
  /** Toggle the sidekick visibility from the reader toolbar. */
  onToggleSidekick?: () => void;
};

type ReaderType = 'text' | 'novel' | 'manga';

// ═════════════════════════════════════════════════════════════════════════════
// Router — fetches the EPUB once, peeks metadata to pick the reader type, then
// hands the blob to the chosen sub-component. Each sub-component creates its
// own <foliate-view> and calls view.open(blob) inside its engine hook.
// ═════════════════════════════════════════════════════════════════════════════

export function EpubReader({
  fileUrl,
  filename,
  bookTitle,
  initialCfi,
  onLookup,
  onAddCard,
  onProgressChange,
  onBack,
  sidekickOpen,
  onToggleSidekick,
}: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [readerType, setReaderType] = useState<ReaderType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // setState in effect is intentional: this effect syncs from an external
  // trigger (`fileUrl` prop change), wiping any prior load before starting a
  // new one. There is no cascade because the resets are unconditional and
  // the async block does its own dead-flag guarding.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let dead = false;
    setBlob(null);
    setReaderType(null);
    setError(null);

    (async () => {
      try {
        const res = await fetch(fileUrl);
        const fetched = await res.blob();
        if (dead) return;

        const book = await makeBookFromBlob(fetched);
        if (dead) return;

        const isFxl = book.rendition?.layout === 'pre-paginated';
        const isRtl = (book.dir ?? '').toLowerCase() === 'rtl';

        let type: ReaderType = 'text';
        if (isFxl) type = 'manga';
        else if (isRtl) type = 'novel';

        setBlob(fetched);
        setReaderType(type);
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => { dead = true; };
  }, [fileUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  if (!blob || !readerType) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>
      </div>
    );
  }

  // ── Render the appropriate reader ───────────────────────────────────────

  const shared = {
    blob, filename, bookTitle, initialCfi,
    onLookup, onAddCard, onProgressChange, onBack,
    sidekickOpen, onToggleSidekick,
  };

  switch (readerType) {
    case 'manga':
      return <MangaReader {...shared} />;
    case 'novel':
      return <NovelReader {...shared} />;
    default:
      return <TextReader {...shared} />;
  }
}
