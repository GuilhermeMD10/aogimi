'use client';

// All MangaReader state, refs, effects, and navigation handlers.
//
// Engine is foliate-js: <foliate-view> with the foliate-fxl renderer for
// fixed-layout EPUBs. Page = spine item, navigated via view.prev/view.next.
// `viewMode` (single/double/scroll) is currently a cosmetic wrapper layout
// hint — foliate-fxl handles spreads automatically at the viewport level.
// Scroll mode is not yet implemented for fixed-layout; mobile renders it
// via a separate image-scroll view and web will follow the same pattern in
// a future pass.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavItem } from '@/components/reader/TocPanel';
import {
  createFoliateView,
  flattenFoliateToc,
  loadFoliate,
  type FoliateRelocateDetail,
  type FoliateViewElement,
} from '@/lib/foliate';

export type ViewMode = 'single' | 'double' | 'scroll';
export type Panel = 'toc' | null;

export interface UseMangaReaderEngineParams {
  blob: Blob;
}

export function useMangaReaderEngine({ blob }: UseMangaReaderEngineParams) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewElement | null>(null);

  // Within-session page restore when switching view modes (single↔double↔
  // scroll). Not persisted — just keeps your place across the layout toggle.
  const restorePageRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const [currentPage, setCurrentPage] = useState(1);
  const spineTotalRef = useRef(0);
  const [total, setTotal] = useState(0);
  const currentPageRef = useRef(1);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [showPageJump, setShowPageJump] = useState(false);

  // ── Init view ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let dead = false;

    setReady(false);
    setError(null);

    const init = async () => {
      try {
        await loadFoliate();
        if (dead) return;

        const view = createFoliateView();
        view.style.cssText = 'display: block; position: absolute; inset: 0;';
        el.appendChild(view);
        viewRef.current = view;

        const file = new File([blob], 'book.epub', { type: 'application/epub+zip' });
        await view.open(file);
        if (dead) {
          try { view.close(); } catch { /* teardown */ }
          el.removeChild(view);
          return;
        }

        const sections = view.book.sections ?? [];
        spineTotalRef.current = sections.length;
        setTotal(sections.length);

        view.addEventListener('relocate', (ev) => {
          if (dead) return;
          const detail = (ev as CustomEvent<FoliateRelocateDetail>).detail;
          if (!detail) return;

          // For fixed-layout, each spine item is one page; foliate reports
          // the active section index on relocate.
          const idx = typeof detail.index === 'number' ? detail.index : currentPageRef.current - 1;
          const pg = idx + 1;
          currentPageRef.current = pg;
          setCurrentPage(pg);
        });

        // ── Restore page across a view-mode switch ──────────────────────
        const restorePage = restorePageRef.current;
        restorePageRef.current = null;
        if (restorePage !== null && restorePage > 0 && restorePage <= sections.length) {
          const href = sections[restorePage - 1]?.href;
          if (href) { try { await view.goTo(href); } catch { /* fall through */ } }
        }
        if (dead) return;

        setToc(flattenFoliateToc(view.book.toc));
        setReady(true);
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    };

    void init();

    return () => {
      dead = true;
      const view = viewRef.current;
      viewRef.current = null;
      if (view) {
        try { view.close(); } catch { /* foliate teardown */ }
        try { view.remove(); } catch { /* already detached */ }
      }
    };
  }, [blob]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const goToSpine = useCallback(
    (index: number) => {
      const total = spineTotalRef.current;
      if (index < 0 || index >= total) return;
      const sections = viewRef.current?.book.sections ?? [];
      const item = sections[index];
      if (item?.href) void viewRef.current?.goTo(item.href);
    },
    [],
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

  // ── Keyboard ────────────────────────────────────────────────────────────
  const advanceRef = useRef(advancePage);
  const goBackRef = useRef(goBackPage);
  advanceRef.current = advancePage;
  goBackRef.current = goBackPage;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowDown': advanceRef.current(); break;
        case 'ArrowRight': case 'ArrowUp': goBackRef.current(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return {
    // refs
    wrapperRef,
    viewRef,
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
  };
}

export type MangaReaderEngine = ReturnType<typeof useMangaReaderEngine>;
