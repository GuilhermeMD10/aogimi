'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { ReaderShell } from '@/features/books/reader/components/ReaderShell';
import { THEMES } from '@/features/books/reader/lib/readerConstants';

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
};

/**
 * Minimal PDF reader. Loads the document with pdf.js directly, renders each
 * page to its own `<canvas>` stacked vertically, and tracks the currently-
 * visible page via IntersectionObserver for the page counter. No selection,
 * dictionary, highlights, or position persistence — just open + scroll.
 */
export function PdfReaderClient({
  fileUrl,
  bookTitle,
  bookAuthor,
  onBack,
}: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(900);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Resize observer — fit each page width to the container, capped for
  // readability on very wide screens.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(Math.min(el.clientWidth - 32, 1100));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load the document. Cancellation: on unmount or fileUrl change, destroy()
  // releases the worker job so we don't leak.
  useEffect(() => {
    let cancelled = false;
    const task = pdfjsLib.getDocument(fileUrl);
    task.promise
      .then((d) => {
        if (cancelled) {
          void d.destroy();
          return;
        }
        setDoc(d);
        setNumPages(d.numPages);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load PDF');
      });
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [fileUrl]);

  // Track most-visible page → drive the page counter.
  useEffect(() => {
    if (numPages === 0) return;
    const visible = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const page = Number((e.target as HTMLElement).dataset.page);
          if (!page) continue;
          if (e.isIntersecting) visible.set(page, e.intersectionRatio);
          else visible.delete(page);
        }
        let bestPage = 0;
        let bestRatio = 0;
        for (const [p, r] of visible) {
          if (r > bestRatio) {
            bestRatio = r;
            bestPage = p;
          }
        }
        if (bestPage > 0) setCurrentPage(bestPage);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    for (const [, node] of pageRefs.current) if (node) io.observe(node);
    return () => io.disconnect();
  }, [numPages]);

  return (
    <ReaderShell
      title={bookTitle ?? 'PDF'}
      author={bookAuthor}
      onBack={onBack}
      // In-session only. The observer above tracks the visible page, so the bar
      // fills as you scroll — but nothing stores a PDF position yet, so
      // reopening the file starts at zero. Deferred, see DECISIONS.md.
      percent={numPages > 0 ? (currentPage / numPages) * 100 : 0}
      page={numPages > 0 ? { current: currentPage, total: numPages } : undefined}
      // No `onJumpToPage`, no `tools`: the pane scrolls freely with no
      // page→offset mapping, and there's no TOC or text selection to offer.
    >
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto"
        style={{ background: THEMES.light.bg }}
      >
        {error ? (
          <div className="flex h-full items-center justify-center text-[13.5px] text-(--accent)">
            {error}
          </div>
        ) : !doc ? (
          <div className="flex h-full items-center justify-center text-[13.5px] text-(--muted)">
            Opening&hellip;
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                data-page={p}
                ref={(el) => {
                  if (el) pageRefs.current.set(p, el);
                  else pageRefs.current.delete(p);
                }}
                className="shadow"
              >
                <PdfPage doc={doc} pageNumber={p} width={containerWidth} />
              </div>
            ))}
          </div>
        )}
      </div>
    </ReaderShell>
  );
}

/**
 * Renders a single PDF page to a `<canvas>`. Re-renders when `width` changes
 * (e.g. window resize). Owns its own cancellation so a width change mid-
 * render doesn't leak the older task.
 */
function PdfPage({
  doc,
  pageNumber,
  width,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let page: PDFPageProxy | null = null;
    let renderTask: ReturnType<PDFPageProxy['render']> | null = null;

    (async () => {
      try {
        page = await doc.getPage(pageNumber);
        if (cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const scale = width / unscaled.width;
        const viewport = page.getViewport({ scale });
        // Backing scale for crispness on retina; cap to avoid huge canvases.
        const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTask = page.render({ canvasContext: ctx, viewport, canvas });
        await renderTask.promise;
        if (!cancelled) setSize({ w: viewport.width, h: viewport.height });
      } catch {
        // Cancellation / rendering errors are swallowed; outer doc-load error
        // surface already covers fatal failures.
      }
    })();

    return () => {
      cancelled = true;
      try { renderTask?.cancel(); } catch { /* noop */ }
      page?.cleanup();
    };
  }, [doc, pageNumber, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        backgroundColor: '#FFFFFF',
        width: size?.w ?? width,
        // Use the unscaled page's aspect ratio for the placeholder height
        // so the layout doesn't jump while the page is rendering.
        height: size?.h ?? width * 1.4,
      }}
    />
  );
}
