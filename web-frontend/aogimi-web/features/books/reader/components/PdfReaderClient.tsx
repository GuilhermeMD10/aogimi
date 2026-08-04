'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// Must stay below the `pdfjs-dist` import: pdf_viewer.mjs carries no imports of
// its own — it binds the core API from `globalThis.pdfjsLib`, which
// `build/pdf.mjs` sets while it evaluates. Same package for both, so the
// viewer constructor's API-version === viewer-version check always holds.
import { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { Search, ZoomIn, ZoomOut } from 'lucide-react';
import { ReaderIconButton, ReaderShell } from '@/features/books/reader/components/ReaderShell';
import { TextContextMenu } from '@/features/books/reader/components/TextContextMenu';
import { useSelectionMenu } from '@/features/books/reader/hooks/useSelectionMenu';
import { pdfPageCfi } from '@/features/books/reader/lib/pdfPosition';
import { THEMES } from '@/features/books/reader/lib/readerConstants';
import 'pdfjs-dist/web/pdf_viewer.css';

// Single pdfjs-dist (the root one). Bundled worker matches the API version
// because both come from the same package.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** Position snapshot emitted on every page change. Mirrors the EPUB readers'
 *  `TextRelocateSnapshot` / `MangaRelocateSnapshot` so `useProgressSync` takes
 *  all three without branching — see `lib/pdfPosition` for the encoding. */
export interface PdfRelocateSnapshot {
  /** `page-N`. */
  cfi: string;
  /** 0–100. */
  progress: number;
  /** 1-based page number. */
  spineIndex: number;
  /** Page count. */
  totalSpineItems: number;
}

export type PdfReaderProps = {
  fileUrl: string;
  bookTitle?: string;
  bookAuthor?: string;
  /** Look the selection up — routed to the docked panel when it's open, the
   *  floating bubble when it isn't (`useReaderActions` decides). */
  onLookup: (word: string, contextSentence?: string) => void;
  /** Turn the selection into a card. */
  onAddCard: (word: string, contextSentence?: string) => void;
  onBack: () => void;
  /** Whether the dictionary sidekick is currently docked. The toolbar toggle
   * renders in its active state while it is. */
  sidekickOpen?: boolean;
  /** Toggle the sidekick visibility from the reader toolbar. */
  onToggleSidekick?: () => void;
  /** 1-based page to open at. Null/undefined = page 1. Consumed once, when the
   *  document's pages are initialised. */
  initialPage?: number | null;
  /** Position callback for progress sync, fired on every page change. */
  onRelocate?: (snapshot: PdfRelocateSnapshot) => void;
};

/**
 * PDF reader built on pdf.js's own `PDFViewer`, which owns everything the old
 * hand-rolled canvas pipeline did badly or not at all: page layout, zoom with
 * scroll anchoring (CSS-scales the current canvases, then re-renders crisply),
 * rendering only the pages near the viewport instead of all of them, and a
 * real text layer. That text layer is what the selection menu below reads:
 * right-click a selection and you get the same Dictionary / Add-card menu the
 * EPUB reader has, so a PDF is no longer a dead end for lookups. The rest of
 * this file is the chrome: the shell, a page counter fed from the viewer's
 * `pagechanging` event, and zoom buttons driving `increaseScale()` /
 * `decreaseScale()`.
 *
 * Reading position is persisted at page granularity, in the same `page-N` form
 * the mobile PDF reader writes (`lib/pdfPosition`), so a book followed on the
 * phone reopens on the right page here. What is *not* stored is where inside a
 * page you were — reopening lands at the top of it — and highlights still have
 * nothing to anchor to.
 */
export function PdfReaderClient({
  fileUrl,
  bookTitle,
  bookAuthor,
  onLookup,
  onAddCard,
  onBack,
  sidekickOpen = false,
  onToggleSidekick,
  initialPage,
  onRelocate,
}: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerElRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PDFViewer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  /** Absolute zoom for the readout: 100 = the page's actual size, and
   *  fit-to-width is whatever percentage the pane implies. */
  const [scalePct, setScalePct] = useState(100);
  const [error, setError] = useState<string | null>(null);

  // The scroll container is also the selection surface: every page's text layer
  // is inside it, so one listener covers the document.
  const { menuRef, anchor, selectedText, contextSentence, closeMenu } =
    useSelectionMenu(containerRef);

  // The viewer effect below is keyed on the file alone — it must not tear the
  // document down because a parent re-render handed us a new callback — so the
  // relocate handler is read through a ref. `initialPage` goes in one too:
  // restore is a one-shot at open, and a later prop change (a flush landing
  // upstream) must not yank the reader back to a stale page.
  const onRelocateRef = useRef(onRelocate);
  useEffect(() => { onRelocateRef.current = onRelocate; }, [onRelocate]);
  // A layout effect, so the ref is current before the (passive) viewer effect
  // in the same commit reads it — the pattern `useProgressSync` uses for its
  // own session ref. Opening a second book changes `fileUrl` and `initialPage`
  // together, and this ordering is what makes the new book restore to *its*
  // page instead of the previous one's.
  const initialPageRef = useRef(initialPage);
  useLayoutEffect(() => { initialPageRef.current = initialPage; }, [initialPage]);

  /** Last page handed to `onRelocate`. Dedup guard, and the reason the restore
   *  jump doesn't count as a page turn: it reports the page it lands on first,
   *  so the `pagechanging` it provokes is a repeat and stops here. */
  const lastReportedPageRef = useRef(0);

  // One lifecycle, keyed on the file: build the viewer, load the document into
  // it, tear both down. Every state write below is an async consequence of a
  // pdf.js promise or eventBus event syncing into React.
  useEffect(() => {
    const container = containerRef.current;
    const viewerEl = viewerElRef.current;
    if (!container || !viewerEl) return;

    let dead = false;
    // New file, new session: the first page of it has to be reported (as this
    // session's seed) even if it happens to be the page the last book ended on.
    lastReportedPageRef.current = 0;

    const eventBus = new EventBus();
    const viewer = new PDFViewer({
      container,
      viewer: viewerEl,
      eventBus,
      // No annotation layer in v1 — no forms or links rendered, and none of
      // the icon assets its CSS would pull in. The text layer keeps its
      // default (enabled). The link service defaults to the built-in
      // SimpleLinkService, which is inert without link annotations.
      annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    });
    viewerRef.current = viewer;

    /** Report a position upward. Deduped on the page, so scrolling within one
     *  page (or re-entering it) costs nothing. */
    const report = (page: number, total: number) => {
      if (dead || page === lastReportedPageRef.current) return;
      lastReportedPageRef.current = page;
      onRelocateRef.current?.({
        cfi: pdfPageCfi(page),
        progress: total > 0 ? Math.round((page / total) * 100) : 0,
        spineIndex: page,
        totalSpineItems: total,
      });
    };

    // Pages exist: apply the layout, then restore.
    //
    // Fit-to-width is the reader's one layout mode. Presets are evaluated at
    // assignment, so this waits for the pages to exist and is re-applied on
    // container resize below. It comes *before* the page jump on purpose —
    // assigning a scale scrolls the current page back into view, so doing it
    // second would re-anchor on whatever page the restore had just left.
    //
    // The restored page is then reported immediately. That is what makes
    // opening a book safe: `useProgressSync` treats the first position of a
    // session as already-persisted (it only seeds the dedup baseline), so this
    // never writes back, and the `pagechanging` the jump provokes is a repeat
    // that `report` drops. Without it, the first *real* page turn would be the
    // one that got swallowed as the seed.
    const onPagesInit = () => {
      viewer.currentScaleValue = 'page-width';

      const total = viewer.pagesCount;
      const target = Math.min(Math.max(initialPageRef.current ?? 1, 1), Math.max(total, 1));
      if (target > 1) viewer.currentPageNumber = target;
      setCurrentPage(target);
      report(target, total);
    };
    const onPageChanging = (evt: { pageNumber: number }) => {
      setCurrentPage(evt.pageNumber);
      report(evt.pageNumber, viewer.pagesCount);
    };
    const onScaleChanging = (evt: { scale: number }) => setScalePct(Math.round(evt.scale * 100));
    eventBus.on('pagesinit', onPagesInit);
    eventBus.on('pagechanging', onPageChanging);
    eventBus.on('scalechanging', onScaleChanging);

    const task = pdfjsLib.getDocument(fileUrl);
    task.promise
      .then((doc) => {
        if (dead) {
          void doc.destroy();
          return;
        }
        viewer.setDocument(doc);
        setNumPages(doc.numPages);
        // The current page isn't seeded here even though `pagechanging` never
        // fires for the initial one: `pagesinit` (dispatched later in
        // setDocument's own chain) sets it, and it knows whether a saved page
        // is being restored. Seeding 1 here would paint the counter at 1 for a
        // frame before the jump.
      })
      .catch((e: unknown) => {
        if (!dead) setError(e instanceof Error ? e.message : 'Failed to load PDF');
      });

    // The viewer doesn't re-evaluate presets when its container resizes (the
    // standalone app re-assigns on window resize, and so must we): without
    // this, docking the dictionary or resizing the window would leave the
    // pages at a stale width. Numeric scales the user chose are left alone.
    const ro = new ResizeObserver(() => {
      if (dead || !viewer.pdfDocument) return;
      // Re-scaling makes the viewer scroll the current page back into view, and
      // pdf.js's `scrollIntoView` needs an `offsetParent` — which is null the
      // moment this container is detached or display:none'd. That happens on
      // every exit: React detaches the DOM during the commit, ResizeObserver
      // callbacks are delivered before paint, and *this* effect's cleanup (a
      // passive one) only disconnects the observer after paint. So the resize
      // that detaching causes is delivered to a container that no longer has a
      // box, and pdf.js logs "offsetParent is not set -- cannot scroll".
      // Same ordering trap as foliate's paginator — see useTextReaderEngine.
      if (!container.offsetParent) return;
      const value = viewer.currentScaleValue;
      if (value === 'page-width' || value === 'page-fit' || value === 'auto') {
        viewer.currentScaleValue = value;
      }
      viewer.update();
    });
    ro.observe(container);

    return () => {
      dead = true;
      ro.disconnect();
      eventBus.off('pagesinit', onPagesInit);
      eventBus.off('pagechanging', onPageChanging);
      eventBus.off('scalechanging', onScaleChanging);
      viewerRef.current = null;
      // Null is the viewer's own teardown path (cancels rendering, drops the
      // page views) — its typings just don't admit it. The loading task's
      // destroy then takes the document and worker down with it.
      viewer.setDocument(null as unknown as PDFDocumentProxy);
      void task.destroy();
    };
  }, [fileUrl]);

  // Min/max clamping lives inside the viewer (its bounds aren't exported), so
  // the buttons stay enabled and stepping past an end is simply a no-op.
  const zoomOut = () => viewerRef.current?.decreaseScale();
  const zoomIn = () => viewerRef.current?.increaseScale();
  const zoomReset = () => {
    const viewer = viewerRef.current;
    if (viewer?.pdfDocument) viewer.currentScaleValue = 'page-width';
  };

  return (
    <ReaderShell
      title={bookTitle ?? 'PDF'}
      author={bookAuthor}
      onBack={onBack}
      // Page-granular and persisted: the viewer reports the visible page as you
      // scroll, and that page is what gets flushed, so reopening the file fills
      // the bar to where you left it.
      percent={numPages > 0 ? (currentPage / numPages) * 100 : 0}
      page={numPages > 0 ? { current: currentPage, total: numPages } : undefined}
      // No `onJumpToPage` yet — the viewer can jump (`currentPageNumber`), it
      // just isn't offered in this pass. No TOC or selection tools either.
      // Zoom and the dictionary toggle are the tool cluster; the docked panel
      // has its own search field (same reasoning as the fixed-layout manga
      // reader, whose pages are images).
      tools={
        <>
          <ReaderIconButton label="Zoom out" onClick={zoomOut}>
            <ZoomOut size={19} strokeWidth={1.8} />
          </ReaderIconButton>
          {/* The readout doubles as reset — back to fit-to-width. */}
          <ReaderIconButton label="Reset zoom to fit width" onClick={zoomReset}>
            <span className="font-[family-name:var(--face-mono)] text-[11px] font-bold">
              {scalePct}%
            </span>
          </ReaderIconButton>
          <ReaderIconButton label="Zoom in" onClick={zoomIn}>
            <ZoomIn size={19} strokeWidth={1.8} />
          </ReaderIconButton>

          {onToggleSidekick && (
            <ReaderIconButton
              label={sidekickOpen ? 'Hide dictionary' : 'Open dictionary'}
              active={sidekickOpen}
              onClick={onToggleSidekick}
            >
              <Search size={19} strokeWidth={1.8} />
            </ReaderIconButton>
          )}
        </>
      }
    >
      <div className="min-h-0 flex-1" style={{ background: THEMES.light.bg }}>
        {/* The old reader capped pages at ~1100px for readability; the cap
            survives as this centred column. PDFViewer requires its scroll
            container to be absolutely positioned, so the cap lives on the
            relative wrapper the container insets against. */}
        <div className="relative mx-auto h-full max-w-[1100px]">
          <div ref={containerRef} className="absolute inset-0 overflow-auto">
            <div ref={viewerElRef} className="pdfViewer" />
          </div>

          {(error !== null || numPages === 0) && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ background: THEMES.light.bg }}
            >
              {error ? (
                <p className="max-w-sm px-8 text-center text-[13.5px] text-(--accent)">{error}</p>
              ) : (
                <p className="text-[13.5px] text-(--muted)">Opening&hellip;</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Portalled to the body for the same reason the EPUB reader does it: the
          menu is positioned in viewport coordinates and the pages scroll. */}
      {anchor &&
        createPortal(
          <TextContextMenu
            ref={menuRef}
            x={anchor.x}
            y={anchor.y}
            onLookup={() => onLookup(selectedText, contextSentence)}
            onAddCard={() => onAddCard(selectedText, contextSentence)}
            onClose={closeMenu}
          />,
          document.body,
        )}
    </ReaderShell>
  );
}
