'use client';

import { useEffect, useState } from 'react';
import { TextReader } from '@/features/books/reader/components/TextReader';
import { MangaReader } from '@/features/books/reader/components/MangaReader';
import { makeBookFromBlob } from '@/features/books/reader/lib/foliate';

// ── Props (same interface as before — nothing changes for consumers) ─────────

/** Position snapshot forwarded from whichever sub-reader is active, consumed
 *  by `useProgressSync`. Same shape across all reader types. */
export type ReaderRelocateSnapshot = {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

type Props = {
  fileUrl: string;
  bookTitle: string;
  bookAuthor?: string;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onBack: () => void;
  /** Whether the dictionary sidekick is currently docked. Reader toolbars use
   * this to render the toggle in its active state. */
  sidekickOpen?: boolean;
  /** Toggle the sidekick visibility from the reader toolbar. */
  onToggleSidekick?: () => void;
  /** CFI to restore to on open (flowing EPUBs). */
  initialCfi?: string | null;
  /** Spine index to restore to on open (fixed-layout / manga EPUBs). */
  initialSpineIndex?: number | null;
  /** Position callback for progress sync, fired on every page turn. */
  onRelocate?: (snapshot: ReaderRelocateSnapshot) => void;
};

type ReaderType = 'text' | 'manga';

// ═════════════════════════════════════════════════════════════════════════════
// Router — fetches the EPUB once, peeks metadata to pick the reader type, then
// hands the blob to the chosen sub-component. Each sub-component creates its
// own <foliate-view> and calls view.open(blob) inside its engine hook.
//
// Only two types now. Vertical Japanese text used to be a third ("novel"), but
// writing mode is a Display setting — the file's `dir` decides what it opens
// as, not what it can be. Layout is the real fork: fixed-layout pages are
// images and can't do any of what the flowing reader offers.
// ═════════════════════════════════════════════════════════════════════════════

export function EpubReader({
  fileUrl,
  bookTitle,
  bookAuthor,
  onLookup,
  onAddCard,
  onBack,
  sidekickOpen,
  onToggleSidekick,
  initialCfi,
  initialSpineIndex,
  onRelocate,
}: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [readerType, setReaderType] = useState<ReaderType | null>(null);
  const [defaultVertical, setDefaultVertical] = useState(false);
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
    setDefaultVertical(false);
    setError(null);

    (async () => {
      try {
        const res = await fetch(fileUrl);
        const fetched = await res.blob();
        if (dead) return;

        const book = await makeBookFromBlob(fetched);
        if (dead) return;

        const isFxl = book.rendition?.layout === 'pre-paginated';
        // `dir: rtl` means the pages progress right-to-left, which for a
        // flowing Japanese book means it was typeset vertically. Seeds the
        // pref; the reader can switch it in Display.
        const isRtl = (book.dir ?? '').toLowerCase() === 'rtl';

        setBlob(fetched);
        setDefaultVertical(isRtl);
        setReaderType(isFxl ? 'manga' : 'text');
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
      <div className="flex h-full items-center justify-center p-8">
        <p className="max-w-sm text-center text-[13.5px] text-(--accent)">
          This book couldn&apos;t be opened: {error}
        </p>
      </div>
    );
  }

  if (!blob || !readerType) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13.5px] text-(--muted)">Opening&hellip;</p>
      </div>
    );
  }

  // ── Render the appropriate reader ───────────────────────────────────────

  const shared = {
    blob, bookTitle, bookAuthor,
    onLookup, onAddCard, onBack,
    sidekickOpen, onToggleSidekick,
    initialCfi, initialSpineIndex, onRelocate,
  };

  return readerType === 'manga' ? (
    <MangaReader {...shared} />
  ) : (
    <TextReader {...shared} defaultVertical={defaultVertical} />
  );
}
