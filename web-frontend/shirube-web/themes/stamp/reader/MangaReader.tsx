'use client';

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  BookmarkPlus,
  Highlighter,
  Search,
} from 'lucide-react';
import { ICON_BTN, ICON_BTN_ON } from '@/components/reader/readerConstants';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';
import {
  useMangaReaderEngine,
  type ViewMode,
} from '@/components/reader/MangaReader/useMangaReaderEngine';
import { MangaReaderBody } from '@/components/reader/MangaReader/MangaReaderBody';
import type { MangaReaderProps } from '@/components/reader/MangaReader/MangaReader';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'single', label: '1' },
  { key: 'double', label: '2' },
  { key: 'scroll', label: '∞' },
];

const MODE_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors';
const MODE_BTN_ON = 'bg-lgc-accent text-lgc-accent-fg';
const MODE_BTN_OFF = 'bg-lgc-bg-sunken text-lgc-fg-muted hover:text-lgc-fg';

export function MangaReader({
  blob,
  filename,
  bookTitle,
  initialCfi,
  onProgressChange,
  onBack,
  sidekickOpen = false,
  onToggleSidekick,
}: MangaReaderProps) {
  const engine = useMangaReaderEngine({ blob, filename, initialCfi, onProgressChange });
  const {
    currentPage,
    currentPageRef,
    total,
    viewMode,
    setViewMode,
    panel,
    setPanel,
    showPageJump,
    setShowPageJump,
    advancePage,
    goBackPage,
    goToPage,
    addBookmark,
    restorePageRef,
  } = engine;

  const pageFraction = total > 0 ? ((currentPage / total) * 100).toFixed(1) : '0';

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-lgc-bg">
      <div
        className="flex shrink-0 items-center gap-2 border-b border-lgc-border px-2 py-1"
        style={{
          fontSize: 12,
          color: 'var(--lgc-fg-muted)',
          background: 'var(--lgc-bg-elev)',
          backdropFilter: 'none',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1 px-1.5 py-1 text-[12px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          title="Back to library"
          style={{
            borderRadius: 0,
            fontFamily: 'var(--lgc-font-mono)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
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

        <span
          className="shrink-0 text-[11px] text-lgc-fg-muted font-mono"
          style={{ fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.16em', }}
        >
          {currentPage} / {total}
        </span>
        <ReaderProgressBar fraction={Number(pageFraction)} rtl />

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button type="button" className={ICON_BTN} onClick={advancePage} title="Next page (advance)"><ChevronLeft size={14} /></button>
          <button type="button" className={ICON_BTN} onClick={goBackPage} title="Previous page (go back)"><ChevronRight size={14} /></button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          <button type="button" className={`${ICON_BTN} ${panel === 'toc' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'toc' ? null : 'toc'))} title="Table of contents"><List size={14} /></button>
          <button type="button" className={`${ICON_BTN} ${panel === 'bookmarks' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'bookmarks' ? null : 'bookmarks'))} title="Bookmarks"><Highlighter size={14} /></button>
          <button type="button" className={ICON_BTN} onClick={addBookmark} title="Add bookmark (B)"><BookmarkPlus size={14} /></button>

          {onToggleSidekick && (
            <>
              <span className="mx-1 h-4 w-px bg-lgc-border" />
              <button
                type="button"
                className={`${ICON_BTN} ${sidekickOpen ? ICON_BTN_ON : ''}`}
                onClick={onToggleSidekick}
                title={sidekickOpen ? 'Hide dictionary' : 'Open dictionary'}
                aria-pressed={sidekickOpen}
              >
                <Search size={14} />
              </button>
            </>
          )}

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          <div className="flex gap-0.5 px-0.5">
            {VIEW_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  if (m.key === viewMode) return;
                  let page = currentPageRef.current;
                  if (m.key === 'double' && page > 1 && page % 2 === 1) {
                    page -= 1;
                  }
                  restorePageRef.current = page;
                  setViewMode(m.key);
                }}
                className={`${MODE_BTN} ${viewMode === m.key ? MODE_BTN_ON : MODE_BTN_OFF}`}
                title={m.key === 'single' ? 'Single page' : m.key === 'double' ? 'Double page' : 'Scroll'}
              >
                {m.label}
              </button>
            ))}
          </div>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          {showPageJump ? (
            <form
              className="flex items-center px-1"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.currentTarget.elements as HTMLFormControlsCollection).namedItem('page') as HTMLInputElement;
                const val = parseInt(input.value, 10);
                if (val > 0 && val <= total) goToPage(val);
                setShowPageJump(false);
              }}
            >
              <input
                name="page" type="number" min={1} max={total} defaultValue={currentPage} autoFocus
                onBlur={() => setShowPageJump(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowPageJump(false); }}
                className="w-12 rounded-md border border-lgc-border bg-lgc-bg-sunken px-1.5 py-0.5 text-center text-[11px] text-lgc-fg outline-none focus:border-lgc-accent font-mono"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </form>
          ) : (
            <button type="button" onClick={() => setShowPageJump(true)} className="px-2 text-[11px] text-lgc-fg-muted transition-colors hover:text-lgc-fg font-mono" style={{ fontVariantNumeric: 'tabular-nums' }} title="Go to page">
              p. {currentPage}
            </button>
          )}
        </div>
      </div>

      <MangaReaderBody engine={engine} />
    </div>
  );
}
