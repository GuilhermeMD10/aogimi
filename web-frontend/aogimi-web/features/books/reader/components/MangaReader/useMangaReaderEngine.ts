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

  // Relocate handler can change between renders; the init effect reads the
  // latest via this ref so it doesn't need to re-run (and re-open the book).
  const onRelocateRef = useRef(onRelocate);
  useEffect(() => { onRelocateRef.current = onRelocate; }, [onRelocate]);
  // Saved spine index to open at. A ref so a prop change can't re-run the init
  // effect; read once per open, right after view.open().
  const initialSpineIndexRef = useRef(initialSpineIndex);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  const [currentPage, setCurrentPage] = useState(1);
  const spineTotalRef = useRef(0);
  const [total, setTotal] = useState(0);

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

          // For fixed-layout, each spine item is one page. The spine index is
          // `section.current` — the detail has no top-level `index` (see
          // FoliateRelocateDetail). No index, no update: inventing one is how
          // every flush ended up writing spineIndex 0.
          const idx = detail.section?.current;
          if (typeof idx !== 'number') return;
          const pg = idx + 1;
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

        // ── First paint + saved-position restore (one-shot, per open) ───
        // Unconditional, and that is the point: the fixed-layout renderer
        // paints nothing until something navigates it, so a cold open needs
        // this goTo(0) just as much as a restore needs goTo(savedIdx). Skip it
        // and the reader stays black.
        //
        // The relocate it triggers only seeds the sync baseline (see
        // useProgressSync), so it never writes the opening position back.
        const savedIdx = initialSpineIndexRef.current;
        const startIndex =
          typeof savedIdx === 'number' && savedIdx > 0 && savedIdx < sections.length
            ? savedIdx
            : 0;
        await view.goTo(startIndex);
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
  // Page turns go through view.next/view.prev, never index arithmetic. The
  // renderer's unit is the *spread* (two spine items paired unless
  // `rendition:spread === 'none'`), and only next/prev flip the side within a
  // spread, report the new location, and honour the book's rtl reading order.
  // Index-driven turns stall on every second page, because goToSpread
  // short-circuits without reporting when the target is already in the spread
  // on screen. next() advances in *reading* order, so it stays correct for
  // right-to-left manga — the left button is the one wired to it.
  const advancePage = useCallback(() => { void viewRef.current?.next(); }, []);
  const goBackPage = useCallback(() => { void viewRef.current?.prev(); }, []);

  /** Absolute jump for the page selector; a plain number is a spine index, and
   *  the renderer resolves which spread and side that page lives on. */
  const goToPage = useCallback((pageNum: number) => {
    const spineTotal = spineTotalRef.current;
    if (spineTotal === 0) return;
    const idx = Math.max(0, Math.min(spineTotal - 1, pageNum - 1));
    void viewRef.current?.goTo(idx);
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────
  // Depends on the two callbacks rather than mirroring them into refs. Writing
  // `ref.current` during render is what `react-hooks/refs` forbids, and the
  // refs bought nothing: both callbacks now just poke `viewRef`, so they are
  // stable and this listener registers once per mount.
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
