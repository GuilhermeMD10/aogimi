'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  BookmarkPlus,
  Highlighter,
} from 'lucide-react';
import { useBookStorage } from '@/components/reader/useBookStorage';
import { TocPanel, type NavItem } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { ICON_BTN, ICON_BTN_ON } from '@/components/reader/readerConstants';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';

export type MangaReaderProps = {
  book: Book;
  filename: string;
  bookTitle: string;
  initialCfi?: string;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onProgressChange?: (progress: number, cfi: string) => void;
  onBack: () => void;
};

type ViewMode = 'single' | 'double' | 'scroll';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'single', label: '1' },
  { key: 'double', label: '2' },
  { key: 'scroll', label: '∞' },
];

const MODE_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors';
const MODE_BTN_ON = 'bg-lgc-accent text-lgc-accent-fg';
const MODE_BTN_OFF = 'bg-lgc-bg-sunken text-lgc-fg-muted hover:text-lgc-fg';

type Panel = 'toc' | 'bookmarks' | null;

export function MangaReader({
  book,
  filename,
  bookTitle,
  initialCfi,
  onProgressChange,
  onBack,
}: MangaReaderProps) {
  const {
    lastCfi,
    epubBookmarks,
    saveLastCfi,
    addEpubBookmark,
    removeEpubBookmark,
  } = useBookStorage(filename);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const progressCbRef = useRef(onProgressChange);
  progressCbRef.current = onProgressChange;

  const startCfi = useRef(initialCfi ?? lastCfi ?? undefined);
  const restorePageRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = useRef(0);
  const [total, setTotal] = useState(0);
  const currentPageRef = useRef(1);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [showPageJump, setShowPageJump] = useState(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let dead = false;

    setReady(false);
    setError(null);

    const init = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spineItems = (book.spine as any).spineItems ?? [];
        totalPages.current = spineItems.length;
        setTotal(spineItems.length);

        const rendition = book.renderTo(el, {
          width: '100%',
          height: '100%',
          flow: viewMode === 'scroll' ? 'scrolled' : 'paginated',
          spread: viewMode === 'double' ? 'auto' : 'none',
        });
        renditionRef.current = rendition;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (loc: any) => {
          if (dead) return;
          const cfi = loc?.start?.cfi as string | undefined;
          if (cfi) saveLastCfi(cfi);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const section = (book.spine as any).get(cfi);
          const pg = section ? section.index + 1 : currentPageRef.current;
          currentPageRef.current = pg;
          setCurrentPage(pg);

          const pct = totalPages.current > 0
            ? Math.round((pg / totalPages.current) * 100)
            : 0;
          if (cfi) progressCbRef.current?.(pct, cfi);
        });

        const restorePage = restorePageRef.current;
        restorePageRef.current = null;
        if (restorePage !== null && restorePage > 0 && restorePage <= spineItems.length) {
          await rendition.display(spineItems[restorePage - 1].href);
        } else {
          await rendition.display(startCfi.current ?? undefined);
        }
        if (dead) return;
        setReady(true);

        await book.loaded.navigation;
        if (!dead) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setToc(((book.navigation as any).toc as NavItem[]) ?? []);
        }
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    };

    void init();

    return () => {
      dead = true;
      if (renditionRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renditionRef.current as any).q?.clear();
        try { renditionRef.current.destroy(); } catch { /* epubjs internal teardown */ }
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, viewMode]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renditionRef.current?.resize(el.clientWidth, el.clientHeight);
      }, 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  const goToSpine = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalPages.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = (book.spine as any).spineItems?.[index];
      if (item) void renditionRef.current?.display(item.index);
    },
    [book],
  );

  const advancePage = useCallback(() => {
    const step = viewMode === 'double' ? 2 : 1;
    goToSpine(currentPageRef.current + step - 1);
  }, [goToSpine, viewMode]);
  const goBackPage = useCallback(() => {
    const step = viewMode === 'double' ? 2 : 1;
    goToSpine(currentPageRef.current - step - 1);
  }, [goToSpine, viewMode]);

  const goToPage = useCallback(
    (pageNum: number) => {
      let idx = Math.max(0, pageNum - 1);
      if (viewMode === 'double' && idx > 0 && idx % 2 === 0) {
        idx -= 1;
      }
      goToSpine(idx);
    },
    [goToSpine, viewMode],
  );

  const addBookmark = useCallback(() => {
    const pg = currentPageRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (book.spine as any).spineItems?.[pg - 1];
    if (!item) return;
    const cfi = item.cfiBase ?? `epubcfi(/6/${(pg - 1) * 2 + 2})`;
    addEpubBookmark({ cfi, label: `Page ${pg}/${totalPages.current}` });
  }, [book, addEpubBookmark]);

  const advanceRef = useRef(advancePage);
  const goBackRef = useRef(goBackPage);
  const bmRef = useRef(addBookmark);
  advanceRef.current = advancePage;
  goBackRef.current = goBackPage;
  bmRef.current = addBookmark;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowDown': advanceRef.current(); break;
        case 'ArrowRight': case 'ArrowUp': goBackRef.current(); break;
        case 'b': case 'B': bmRef.current(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pageFraction = total > 0 ? ((currentPage / total) * 100).toFixed(1) : '0';

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-lgc-bg">
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
          style={{ borderRadius: 6 }}
        >
          <ArrowLeft size={12} />
          <span>Books</span>
        </button>
        <span
          className="min-w-0 max-w-[24ch] shrink truncate text-[12px] font-medium text-lgc-fg"
          style={{ fontFamily: 'var(--lgc-font-display)' }}
          title={bookTitle}
        >
          {bookTitle}
        </span>

        <span className="mx-0.5 h-4 w-px shrink-0 bg-lgc-border" />

        <span
          className="shrink-0 text-[11px] text-lgc-fg-muted"
          style={{
            fontFamily: 'var(--lgc-font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
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
                className="w-12 rounded-md border border-lgc-border bg-lgc-bg-sunken px-1.5 py-0.5 text-center text-[11px] text-lgc-fg outline-none focus:border-lgc-accent"
                style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
              />
            </form>
          ) : (
            <button type="button" onClick={() => setShowPageJump(true)} className="px-2 text-[11px] text-lgc-fg-muted transition-colors hover:text-lgc-fg" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} title="Go to page">
              p. {currentPage}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {panel === 'toc' && (
          <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
            <TocPanel
              items={toc}
              onNavigate={(href) => { void renditionRef.current?.display(href); setPanel(null); }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        {panel === 'bookmarks' && (
          <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
            <AnnotationsPanel
              epubHighlights={[]}
              epubBookmarks={epubBookmarks}
              onJumpEpubHighlight={() => {}}
              onDeleteEpubHighlight={() => {}}
              onJumpEpubBookmark={(b) => { void renditionRef.current?.display(b.cfi); setPanel(null); }}
              onDeleteEpubBookmark={removeEpubBookmark}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        <div className="relative min-w-0 flex-1 bg-lgc-bg">
          {(error || !ready) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-lgc-bg">
              {error
                ? <p className="max-w-sm text-center text-sm text-lgc-error">EPUB load error: {error}</p>
                : <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
            </div>
          )}

          <div className="absolute inset-0 flex justify-center overflow-hidden">
            <div
              ref={wrapperRef}
              className="h-full overflow-hidden"
              style={
                viewMode === 'single'
                  ? { aspectRatio: '2/3', maxWidth: '100%' }
                  : { width: '100%' }
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
