'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import {
  ChevronLeft,
  ChevronRight,
  List,
  BookmarkPlus,
} from 'lucide-react';
import { useBookStorage } from '@/components/reader/useBookStorage';
import { TocPanel, type NavItem } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { ICON_BTN, ICON_BTN_ON } from '@/components/reader/readerConstants';

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  book: Book;
  filename: string;
  initialCfi?: string;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onProgressChange?: (progress: number, cfi: string) => void;
};

// ── View modes ──────────────────────────────────────────────────────────────

type ViewMode = 'single' | 'double' | 'scroll';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'single', label: '1' },
  { key: 'double', label: '2' },
  { key: 'scroll', label: '∞' },
];

// ── Shared class strings ────────────────────────────────────────────────────

const MODE_BTN =
  'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors';
const MODE_BTN_ON = 'bg-lgc-accent text-lgc-accent-fg';
const MODE_BTN_OFF = 'bg-lgc-bg-sunken text-lgc-fg-muted hover:text-lgc-fg';

type Panel = 'toc' | 'bookmarks' | null;

// ═════════════════════════════════════════════════════════════════════════════
// MangaReader — fixed-layout / pre-paginated EPUBs
// ═════════════════════════════════════════════════════════════════════════════

export function MangaReader({
  book,
  filename,
  initialCfi,
  onProgressChange,
}: Props) {
  const {
    lastCfi,
    epubBookmarks,
    saveLastCfi,
    addEpubBookmark,
    removeEpubBookmark,
  } = useBookStorage(filename);

  // ── Refs ──────────────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const progressCbRef = useRef(onProgressChange);
  progressCbRef.current = onProgressChange;

  const startCfi = useRef(initialCfi ?? lastCfi ?? undefined);
  // When switching view modes, store the page to restore (spine index is more reliable than CFI)
  const restorePageRef = useRef<number | null>(null);

  // ── State ─────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  // Spine-based page tracking — simple and reliable for FXL
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = useRef(0);
  const [total, setTotal] = useState(0);
  const currentPageRef = useRef(1);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [showPageJump, setShowPageJump] = useState(false);

  // ── Init rendition ────────────────────────────────────────────────────
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

        // ── Relocated — track current page by spine index ───────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (loc: any) => {
          if (dead) return;
          const cfi = loc?.start?.cfi as string | undefined;
          if (cfi) saveLastCfi(cfi);

          // Get page from spine index
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const section = (book.spine as any).get(cfi);
          const pg = section ? section.index + 1 : currentPageRef.current;
          currentPageRef.current = pg;
          setCurrentPage(pg);

          // Report progress as percentage
          const pct = totalPages.current > 0
            ? Math.round((pg / totalPages.current) * 100)
            : 0;
          if (cfi) progressCbRef.current?.(pct, cfi);
        });

        // ── Display — restore from page index (view-mode switch) or CFI (initial load)
        const restorePage = restorePageRef.current;
        restorePageRef.current = null;
        if (restorePage !== null && restorePage > 0 && restorePage <= spineItems.length) {
          await rendition.display(spineItems[restorePage - 1].href);
        } else {
          await rendition.display(startCfi.current ?? undefined);
        }
        if (dead) return;
        setReady(true);

        // Load TOC
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
        // epubjs destroy() doesn't clear its queue (commented out in source),
        // so pending start() can fire after book ref is nulled → crash.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renditionRef.current as any).q?.clear();
        try { renditionRef.current.destroy(); } catch { /* epubjs internal teardown */ }
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, viewMode]);

  // Reflow rendition when container size changes (width or height)
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

  // ── Navigation — direct spine index, bypasses epubjs scroll logic ─────
  const goToSpine = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalPages.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = (book.spine as any).spineItems?.[index];
      if (item) void renditionRef.current?.display(item.index);
    },
    [book],
  );

  // Manga is RTL: left = advance (higher index), right = go back (lower index)
  // In double-spread mode, step by 2 so we don't repeat a page
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
      // In double mode, align to pair start (odd 0-based indices after cover)
      if (viewMode === 'double' && idx > 0 && idx % 2 === 0) {
        idx -= 1;
      }
      goToSpine(idx);
    },
    [goToSpine, viewMode],
  );

  // ── Bookmarks ─────────────────────────────────────────────────────────
  const addBookmark = useCallback(() => {
    const pg = currentPageRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (book.spine as any).spineItems?.[pg - 1];
    if (!item) return;
    const cfi = item.cfiBase ?? `epubcfi(/6/${(pg - 1) * 2 + 2})`;
    addEpubBookmark({ cfi, label: `Page ${pg}/${totalPages.current}` });
  }, [book, addEpubBookmark]);

  // ── Keyboard ──────────────────────────────────────────────────────────
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
        // RTL: left = advance, right = go back
        case 'ArrowLeft': case 'ArrowDown': advanceRef.current(); break;
        case 'ArrowRight': case 'ArrowUp': goBackRef.current(); break;
        case 'b': case 'B': bmRef.current(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────
  const pageFraction = total > 0 ? ((currentPage / total) * 100).toFixed(1) : '0';

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-lgc-bg">

      {/* ── Top info bar ──────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-lgc-border px-4 py-2.5"
        style={{
          fontSize: 12,
          color: 'var(--lgc-fg-muted)',
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
          zIndex: 5,
        }}
      >
        <span
          className="text-[11px] text-lgc-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          {currentPage} / {total}
        </span>
        {/* RTL progress bar — fills from right to left */}
        <div className="relative ml-auto h-0.75 w-24 rounded-full bg-lgc-bg-sunken" style={{ direction: 'rtl' }}>
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-lgc-accent transition-[width] duration-300"
            style={{ width: `${pageFraction}%` }}
          />
        </div>
      </div>

      {/* ── Main content row ─────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">

        {/* TOC panel */}
        {panel === 'toc' && (
          <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
            <TocPanel
              items={toc}
              onNavigate={(href) => { void renditionRef.current?.display(href); setPanel(null); }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        {/* Bookmarks panel */}
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

        {/* ── Manga viewport ─────────────────────────────────────────── */}
        <div className="relative min-w-0 flex-1 bg-lgc-bg">

          {/* Loading / error overlay */}
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

          {/* ── Bottom floating toolbar ───────────────────────────────── */}
          <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
            <div className="flex items-center gap-0.5 rounded-xl border border-lgc-border-strong p-1 shadow-lg" style={{ background: 'var(--lgc-bg-elev)' }}>

              {/* Prev / Next — RTL: left = advance, right = go back */}
              <button type="button" className={ICON_BTN} onClick={advancePage} title="Next page (advance)">
                <ChevronLeft size={15} />
              </button>
              <button type="button" className={ICON_BTN} onClick={goBackPage} title="Previous page (go back)">
                <ChevronRight size={15} />
              </button>

              <span className="mx-1 h-4.5 w-px bg-lgc-border" />

              {/* TOC */}
              <button type="button" className={`${ICON_BTN} ${panel === 'toc' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'toc' ? null : 'toc'))} title="Table of contents">
                <List size={15} />
              </button>

              {/* Bookmark */}
              <button type="button" className={ICON_BTN} onClick={addBookmark} title="Add bookmark (B)">
                <BookmarkPlus size={15} />
              </button>

              <span className="mx-1 h-4.5 w-px bg-lgc-border" />

              {/* View mode: 1 (single) | 2 (double) | ∞ (scroll) */}
              <div className="flex gap-0.5 px-0.5">
                {VIEW_MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      if (m.key === viewMode) return;
                      let page = currentPageRef.current;
                      // In double mode, align to pair start so both slots fill.
                      // After cover (page 1), pairs are (2,3),(4,5),… i.e. even 1-based pages start pairs.
                      // If we're on an odd page > 1, step back one to the pair start.
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

              <span className="mx-1 h-4.5 w-px bg-lgc-border" />

              {/* Page indicator — click to jump */}
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
                <button type="button" onClick={() => setShowPageJump(true)} className="px-2.5 text-[11px] text-lgc-fg-muted transition-colors hover:text-lgc-fg" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} title="Go to page">
                  p. {currentPage}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
