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
import type { NavItem } from '@/features/books/reader/components/ContentsPanel';
import {
  createFoliateView,
  flattenFoliateToc,
  loadFoliate,
  type FoliateRelocateDetail,
  type FoliateViewElement,
} from '@/features/books/reader/lib/foliate';

export type ViewMode = 'single' | 'double' | 'scroll';
/** The toolbar's popovers share one anchor, so only one can be open. */
export type Panel = 'toc' | 'settings' | null;

/** Position snapshot emitted on every relocate (page turn). Mirrors the
 *  `ProgressSnapshot` consumed by `useProgressSync`. Fixed-layout books have
 *  no meaningful CFI, so `cfi` is empty and restore is by `spineIndex`. */
export interface MangaRelocateSnapshot {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
}

export interface UseMangaReaderEngineParams {
  blob: Blob;
  /** Spine index to restore to once the book is open (0 = start). */
  initialSpineIndex?: number | null;
  /** Called on every relocate with the current position. */
  onRelocate?: (snapshot: MangaRelocateSnapshot) => void;
}

export function useMangaReaderEngine({ blob, initialSpineIndex, onRelocate }: UseMangaReaderEngineParams) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewElement | null>(null);

  // Within-session page restore when switching view modes (single↔double↔
  // scroll). Not persisted — just keeps your place across the layout toggle.
  const restorePageRef = useRef<number | null>(null);

  // Relocate handler can change between renders; the init effect reads the
  // latest via this ref so it doesn't need to re-run (and re-open the book).
  const onRelocateRef = useRef(onRelocate);
  useEffect(() => { onRelocateRef.current = onRelocate; }, [onRelocate]);
  // Saved spine index to restore to, consumed once on the first open.
  const initialSpineIndexRef = useRef(initialSpineIndex);
  const didInitialRestoreRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const [currentPage, setCurrentPage] = useState(1);
  const spineTotalRef = useRef(0);
  const [total, setTotal] = useState(0);
  const currentPageRef = useRef(1);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);

  // ── Init view ───────────────────────────────────────────────────────────
  // Same shape, and the same sanctioned lint exception, as the two sibling
  // engines (`useTextReaderEngine`, `EpubReader`): the resets synchronise React
  // with an external system (foliate + the blob) that can't be read during
  // render, and they clear the *previous* book's state before a new one loads.
  // Unconditional, so there's no cascade — and every later write in the async
  // body is guarded by its own `dead` flag.
  //
  // This file went un-flagged until the ref writes above it were fixed; the
  // plugin stopped at those.
  /* eslint-disable react-hooks/set-state-in-effect */
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

          // Forward the position for progress sync (spine-index based).
          const spineTotal = spineTotalRef.current;
          onRelocateRef.current?.({
            cfi: detail.cfi ?? '',
            progress: spineTotal > 0 ? Math.max(0, Math.min(100, Math.round((pg / spineTotal) * 100))) : 0,
            spineIndex: idx,
            totalSpineItems: spineTotal,
          });
        });

        // ── Restore saved position (one-shot, on first open) ────────────
        // Seeds the same restore path used for view-mode switches. The
        // relocate it triggers only seeds the sync baseline (see
        // useProgressSync), so it never writes the restored position back.
        if (!didInitialRestoreRef.current) {
          didInitialRestoreRef.current = true;
          const savedIdx = initialSpineIndexRef.current;
          if (typeof savedIdx === 'number' && savedIdx > 0 && restorePageRef.current === null) {
            restorePageRef.current = savedIdx + 1;
          }
        }

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
  /* eslint-enable react-hooks/set-state-in-effect */

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
  // Depends on the two callbacks rather than mirroring them into refs. The refs
  // existed to keep this effect's dep list empty, but writing `ref.current`
  // during render is exactly what `react-hooks/refs` forbids — and the thing it
  // was buying is worth very little: `advancePage`/`goBackPage` only change when
  // `viewMode` does, i.e. on a user toggle, so the listener re-registers on a
  // click rather than on every frame.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowDown': advancePage(); break;
        case 'ArrowRight': case 'ArrowUp': goBackPage(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advancePage, goBackPage]);

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
    // handlers
    advancePage,
    goBackPage,
    goToPage,
  };
}

export type MangaReaderEngine = ReturnType<typeof useMangaReaderEngine>;
