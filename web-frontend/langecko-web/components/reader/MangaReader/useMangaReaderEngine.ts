'use client';

// All MangaReader state, refs, effects, and navigation handlers — theme-agnostic.
// Consumed by both default and stamp variants; each variant owns only its top-bar JSX.

import { useCallback, useEffect, useRef, useState } from 'react';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import { useBookStorage } from '@/components/reader/useBookStorage';
import type { NavItem } from '@/components/reader/TocPanel';
import {
  clearRenditionQueue,
  getNavigationToc,
  getSpineItems,
  getSpineSection,
} from '@/lib/types/epubjs';

export type ViewMode = 'single' | 'double' | 'scroll';
export type Panel = 'toc' | 'bookmarks' | null;

export interface UseMangaReaderEngineParams {
  book: Book;
  filename: string;
  initialCfi?: string;
  onProgressChange?: (progress: number, cfi: string) => void;
}

export function useMangaReaderEngine({
  book,
  filename,
  initialCfi,
  onProgressChange,
}: UseMangaReaderEngineParams) {
  const { lastCfi, epubBookmarks, saveLastCfi, addEpubBookmark, removeEpubBookmark } =
    useBookStorage(filename);

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

  // ── Init / re-init rendition ────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let dead = false;

    setReady(false);
    setError(null);

    const init = async () => {
      try {
        const spineItems = getSpineItems(book);
        totalPages.current = spineItems.length;
        setTotal(spineItems.length);

        const rendition = book.renderTo(el, {
          width: '100%',
          height: '100%',
          flow: viewMode === 'scroll' ? 'scrolled' : 'paginated',
          spread: viewMode === 'double' ? 'auto' : 'none',
        });
        renditionRef.current = rendition;

        rendition.on('relocated', (loc: { start?: { cfi?: string } }) => {
          if (dead) return;
          const cfi = loc?.start?.cfi;
          if (cfi) saveLastCfi(cfi);

          const section = cfi ? getSpineSection(book, cfi) : undefined;
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
        if (!dead) setToc(getNavigationToc(book));
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    };

    void init();

    return () => {
      dead = true;
      if (renditionRef.current) {
        clearRenditionQueue(renditionRef.current);
        try { renditionRef.current.destroy(); } catch { /* epubjs internal teardown */ }
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, viewMode]);

  // ── Reflow on container resize ──────────────────────────────────────────
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

  // ── Navigation ──────────────────────────────────────────────────────────
  const goToSpine = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalPages.current) return;
      const item = getSpineItems(book)[index];
      if (item) void renditionRef.current?.display(String(item.index));
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
    const item = getSpineItems(book)[pg - 1];
    if (!item) return;
    const cfi = item.cfiBase ?? `epubcfi(/6/${(pg - 1) * 2 + 2})`;
    addEpubBookmark({ cfi, label: `Page ${pg}/${totalPages.current}` });
  }, [book, addEpubBookmark]);

  // ── Keyboard ────────────────────────────────────────────────────────────
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

  return {
    // refs
    wrapperRef,
    renditionRef,
    currentPageRef,
    restorePageRef,
    // state
    ready,
    error,
    viewMode,
    setViewMode,
    currentPage,
    total,
    toc,
    panel,
    setPanel,
    showPageJump,
    setShowPageJump,
    // handlers
    advancePage,
    goBackPage,
    goToPage,
    addBookmark,
    // bookmarks (from useBookStorage)
    epubBookmarks,
    removeEpubBookmark,
  };
}

export type MangaReaderEngine = ReturnType<typeof useMangaReaderEngine>;
