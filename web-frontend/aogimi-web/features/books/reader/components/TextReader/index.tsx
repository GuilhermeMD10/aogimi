'use client';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Type,
  Volume2,
  VolumeX,
  Search,
} from 'lucide-react';
import { THEMES, ICON_BTN, ICON_BTN_ON } from '@/features/books/reader/lib/readerConstants';
import { ReaderProgressBar } from '@/shared/ui/ReaderProgressBar';
import { useTextReaderEngine, type TextRelocateSnapshot } from './useTextReaderEngine';
import { TextReaderBody } from './TextReaderBody';

export type TextReaderProps = {
  blob: Blob;
  bookTitle: string;
  rtl?: boolean;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onBack: () => void;
  sidekickOpen?: boolean;
  onToggleSidekick?: () => void;
  /** CFI to restore to on open (null/undefined = start). */
  initialCfi?: string | null;
  /** Position callback for progress sync, fired on every page turn. */
  onRelocate?: (snapshot: TextRelocateSnapshot) => void;
};

export function TextReader({
  blob,
  bookTitle,
  rtl = false,
  onLookup,
  onAddCard,
  onBack,
  sidekickOpen = false,
  onToggleSidekick,
  initialCfi,
  onRelocate,
}: TextReaderProps) {
  const engine = useTextReaderEngine({ blob, rtl, initialCfi, onRelocate });
  const {
    chapterLabel,
    globalPage,
    totalLocations,
    panel,
    setPanel,
    showTypo,
    setShowTypo,
    showPageJump,
    setShowPageJump,
    isSpeaking,
    onLeftBtn,
    onRightBtn,
    goToPage,
    toggleTts,
    prefs,
  } = engine;

  const theme = THEMES[prefs.theme];
  const pageFraction = totalLocations > 0 ? ((globalPage / totalLocations) * 100).toFixed(1) : '0';

  return (
    <div className="relative flex h-full min-h-0 flex-col" style={{ background: theme.bg }}>
      <div
        className="flex shrink-0 items-center gap-2 border-b border-lgc-border px-2 py-1"
        style={{
          fontSize: 12,
          color: 'var(--lgc-fg-muted)',
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1 px-1.5 py-1 text-[12px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          title="Back to library"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <ArrowLeft size={12} />
          <span>Books</span>
        </button>
        <span
          className="min-w-0 max-w-[24ch] shrink truncate text-[12px] font-medium text-lgc-fg font-display"
          title={bookTitle}
        >
          {bookTitle}
        </span>

        <span className="mx-0.5 h-4 w-px shrink-0 bg-lgc-border" />

        {chapterLabel && (
          <span className="min-w-0 max-w-[24ch] shrink truncate text-[11.5px] text-lgc-fg-muted">
            {chapterLabel}
          </span>
        )}
        <span
          className="shrink-0 text-[11px] text-lgc-fg-muted font-mono"
          style={{ fontVariantNumeric: 'tabular-nums', }}
        >
          {globalPage} / {totalLocations}
        </span>
        <ReaderProgressBar fraction={Number(pageFraction)} rtl={rtl} />

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button type="button" className={ICON_BTN} onClick={onLeftBtn} title={rtl ? 'Next page (advance)' : 'Previous page'}><ChevronLeft size={14} /></button>
          <button type="button" className={ICON_BTN} onClick={onRightBtn} title={rtl ? 'Previous page (go back)' : 'Next page'}><ChevronRight size={14} /></button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          <button type="button" className={`${ICON_BTN} ${panel === 'toc' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'toc' ? null : 'toc'))} title="Table of contents"><List size={14} /></button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          {onToggleSidekick && (
            <button
              type="button"
              className={`${ICON_BTN} ${sidekickOpen ? ICON_BTN_ON : ''}`}
              onClick={onToggleSidekick}
              title={sidekickOpen ? 'Hide dictionary' : 'Open dictionary'}
              aria-pressed={sidekickOpen}
            >
              <Search size={14} />
            </button>
          )}
          <button data-typo-toggle type="button" className={`${ICON_BTN} ${showTypo ? ICON_BTN_ON : ''}`} onClick={() => setShowTypo((v) => !v)} title="Typography & layout"><Type size={14} /></button>
          <button type="button" className={`${ICON_BTN} ${isSpeaking ? ICON_BTN_ON : ''}`} onClick={toggleTts} title="Read aloud (T)">
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          {showPageJump ? (
            <form
              className="flex items-center px-1"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.currentTarget.elements as HTMLFormControlsCollection).namedItem('page') as HTMLInputElement;
                const val = parseInt(input.value, 10);
                if (val > 0 && val <= totalLocations) goToPage(val);
                setShowPageJump(false);
              }}
            >
              <input
                name="page" type="number" min={1} max={totalLocations} defaultValue={globalPage} autoFocus
                onBlur={() => setShowPageJump(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowPageJump(false); }}
                className="w-12 rounded-md border border-lgc-border bg-lgc-bg-sunken px-1.5 py-0.5 text-center text-[11px] text-lgc-fg outline-none focus:border-lgc-accent font-mono"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </form>
          ) : (
            <button type="button" onClick={() => setShowPageJump(true)} className="px-2 text-[11px] text-lgc-fg-muted transition-colors hover:text-lgc-fg font-mono" style={{ fontVariantNumeric: 'tabular-nums' }} title="Go to page">
              p. {globalPage}
            </button>
          )}
        </div>
      </div>

      <TextReaderBody engine={engine} onLookup={onLookup} onAddCard={onAddCard} />
    </div>
  );
}
