'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// Must stay below the `pdfjs-dist` import: pdf_viewer.mjs carries no imports of
// its own — it binds the core API from `globalThis.pdfjsLib`, which
// `build/pdf.mjs` sets while it evaluates. Same package for both, so the
// viewer constructor's API-version === viewer-version check always holds.
import { EventBus, PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { Search, ZoomIn, ZoomOut } from 'lucide-react';
import { ReaderIconButton, ReaderShell } from '@/features/books/reader/components/ReaderShell';
import { THEMES } from '@/features/books/reader/lib/readerConstants';
import 'pdfjs-dist/web/pdf_viewer.css';

// Single pdfjs-dist (the root one). Bundled worker matches the API version
// because both come from the same package.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export type PdfReaderProps = {
  fileUrl: string;
  bookTitle?: string;
  bookAuthor?: string;
  onBack: () => void;
  /** Whether the dictionary sidekick is currently docked. The toolbar toggle
   * renders in its active state while it is. */
  sidekickOpen?: boolean;
  /** Toggle the sidekick visibility from the reader toolbar. */
  onToggleSidekick?: () => void;
};

/**
 * PDF reader built on pdf.js's own `PDFViewer`, which owns everything the old
 * hand-rolled canvas pipeline did badly or not at all: page layout, zoom with
 * scroll anchoring (CSS-scales the current canvases, then re-renders crisply),
 * rendering only the pages near the viewport instead of all of them, and a
 * real text layer — text is selectable, though nothing is wired to selection
 * yet. This file keeps to the chrome: the shell, a page counter fed from the
 * viewer's `pagechanging` event, and zoom buttons driving `increaseScale()` /
 * `decreaseScale()`. Still no highlights or position persistence, and the
 * docked dictionary remains manual-search only.
 */
export function PdfReaderClient({
  fileUrl,
  bookTitle,
  bookAuthor,
  onBack,
  sidekickOpen = false,
  onToggleSidekick,
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

  // One lifecycle, keyed on the file: build the viewer, load the document into
  // it, tear both down. Every state write below is an async consequence of a
  // pdf.js promise or eventBus event syncing into React.
  useEffect(() => {
    const container = containerRef.current;
    const viewerEl = viewerElRef.current;
    if (!container || !viewerEl) return;

    let dead = false;

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

    // Fit-to-width is the reader's one layout mode. Presets are evaluated at
    // assignment, so this waits for the pages to exist and is re-applied on
    // container resize below.
    const onPagesInit = () => {
      viewer.currentScaleValue = 'page-width';
    };
    const onPageChanging = (evt: { pageNumber: number }) => setCurrentPage(evt.pageNumber);
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
        // `pagechanging` fires on changes only, never for the initial page.
        setCurrentPage(1);
      })
      .catch((e: unknown) => {
        if (!dead) setError(e instanceof Error ? e.message : 'Failed to load PDF');
      });

    // The viewer doesn't re-evaluate presets when its container resizes (the
    // standalone app re-assigns on window resize, and so must we): without
    // this, docking the dictionary or resizing the window would leave the
    // pages at a stale width. Numeric scales the user chose are left alone.
    const ro = new ResizeObserver(() => {
      if (!viewer.pdfDocument) return;
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
      // In-session only. The viewer reports the visible page as you scroll, so
      // the bar fills — but nothing stores a PDF position yet, so reopening
      // the file starts at zero. Deferred, see DECISIONS.md.
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
    </ReaderShell>
  );
}
