'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { DocumentProps, PageProps, OutlineProps } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import { useBookStorage } from '@/components/reader/useBookStorage';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { DeepLTranslationPopup } from '@/components/DeepLTranslationPopup';

// ── Lazy-loaded react-pdf types ───────────────────────────────────────────────

type ReactPdfModule = typeof import('react-pdf');

interface PdfLib {
  Document: (props: DocumentProps) => React.JSX.Element;
  Page:     (props: PageProps)     => React.JSX.Element;
  Outline:  (props: OutlineProps)  => React.JSX.Element;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const btn     = 'flex items-center rounded border border-lumina-border-divider px-2 py-0.5 text-xs hover:bg-black/5 shrink-0';
const btnOn   = 'bg-lumina-primary-teal border-lumina-primary-teal text-black';
const PDF_OPTIONS = { standardFontDataUrl: '/standard_fonts/' };
const MAX_SCALE   = 3.0;
const MIN_SCALE   = 0.4;

// ── Props ─────────────────────────────────────────────────────────────────────

type Panel = 'toc' | 'annotations' | null;

type Props = {
  fileUrl: string;
  filename: string;
  pageNumber: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onLookup: (word: string) => void;
  onAddCard: (word: string) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PdfReader({
  fileUrl,
  filename,
  pageNumber,
  onPageChange,
  scale,
  onScaleChange,
  onLookup,
  onAddCard,
}: Props) {
  const { lastPage, pdfBookmarks, addPdfBookmark, removePdfBookmark, saveLastPage } =
    useBookStorage(filename);

  // ── Renderer ──────────────────────────────────────────────────────────────
  // All three react-pdf components in one state object so a single setState
  // triggers one re-render instead of three.
  const [pdfLib,        setPdfLib]        = useState<PdfLib | null>(null);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [docError,      setDocError]      = useState<string | null>(null);

  // ── Document ──────────────────────────────────────────────────────────────
  const [totalPages, setTotalPages] = useState(0);

  // ── View settings ─────────────────────────────────────────────────────────
  const [viewMode,   setViewMode]   = useState<'single' | 'continuous'>('single');
  const [fitWidth,   setFitWidth]   = useState(false);
  const [pageInput,  setPageInput]  = useState('');
  const [panel,      setPanel]      = useState<Panel>(null);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [showRuler,     setShowRuler]     = useState(false);
  const [rulerOffset,   setRulerOffset]   = useState(40);
  const [verticalRuler, setVerticalRuler] = useState(false);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedText,      setSelectedText]      = useState('');
  const [contextMenu,       setContextMenu]       = useState<{ x: number; y: number } | null>(null);
  const [translationPopup,  setTranslationPopup]  = useState<{ text: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // ── Container / page refs ─────────────────────────────────────────────────
  const contentRef              = useRef<HTMLDivElement>(null);
  const pageRefs                = useRef<Record<number, HTMLDivElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // ── Lazy-load react-pdf ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const m: ReactPdfModule = await import('react-pdf');
        m.pdfjs.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${m.pdfjs.version}/build/pdf.worker.min.mjs`;
        if (cancelled) return;
        setPdfLib({
          Document: m.Document as PdfLib['Document'],
          Page:     m.Page     as PdfLib['Page'],
          Outline:  m.Outline  as PdfLib['Outline'],
        });
      } catch {
        if (!cancelled) setRendererError('Could not load PDF renderer.');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Restore last page on first open ──────────────────────────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (totalPages > 0 && !restoredRef.current && lastPage) {
      restoredRef.current = true;
      onPageChange(Math.min(lastPage, totalPages));
    }
  }, [totalPages, lastPage, onPageChange]);

  // Reset on new file
  useEffect(() => {
    restoredRef.current = false;
    setTotalPages(0);
    pageRefs.current = {};
  }, [fileUrl]);

  // ── Container width for fit-width ─────────────────────────────────────────
  useEffect(() => {
    if (!contentRef.current) return;
    const ro = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    );
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  // ── IntersectionObserver: track visible page in continuous mode ───────────
  useEffect(() => {
    if (viewMode !== 'continuous' || totalPages === 0) return;
    const observer = new IntersectionObserver(
      entries => {
        if (isProgrammaticScrollRef.current) return;
        const best = [...entries]
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          const page = Number((best.target as HTMLElement).dataset.page);
          if (page) { onPageChange(page); saveLastPage(page); }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    Object.values(pageRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [viewMode, totalPages, onPageChange, saveLastPage]);

  // ── Page navigation (used by toolbar, keyboard, TOC) ─────────────────────
  const goTo = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(totalPages, n));
      onPageChange(clamped);
      saveLastPage(clamped);
      if (viewMode === 'continuous') {
        isProgrammaticScrollRef.current = true;
        pageRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => { isProgrammaticScrollRef.current = false; }, 700);
      }
    },
    [totalPages, viewMode, onPageChange, saveLastPage],
  );

  // ── TTS ───────────────────────────────────────────────────────────────────
  const handleTts = useCallback(() => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const textLayer = contentRef.current?.querySelector('.react-pdf__Page__textContent');
    const text = (textLayer?.textContent ?? '').trim();
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend  = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  }, [isSpeaking]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Stable refs avoid stale-closure bugs without re-registering the listener.
  const goToRef      = useRef(goTo);
  const handleTtsRef = useRef(handleTts);
  goToRef.current      = goTo;
  handleTtsRef.current = handleTts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': goToRef.current(pageNumber + 1); break;
        case 'ArrowLeft':  case 'ArrowUp':   goToRef.current(pageNumber - 1); break;
        case '+': case '=': onScaleChange(Math.min(MAX_SCALE, Number((scale + 0.1).toFixed(1)))); break;
        case '-':           onScaleChange(Math.max(MIN_SCALE, Number((scale - 0.1).toFixed(1)))); break;
        case 'b': case 'B': addPdfBookmark({ page: pageNumber, label: `Page ${pageNumber}` }); break;
        case 'r': case 'R': setShowRuler(v => !v); break;
        case 't': case 'T': handleTtsRef.current(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, scale, onScaleChange, addPdfBookmark]);

  // ── Page jump input ───────────────────────────────────────────────────────
  const commitPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) goTo(n);
    setPageInput('');
  };

  const onPageInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitPageInput();
    if (e.key === 'Escape') setPageInput('');
  };

  // ── Selection helpers ─────────────────────────────────────────────────────
  const updateSelection = () =>
    setSelectedText(window.getSelection()?.toString().trim() ?? '');

  const onContextMenu = (e: React.MouseEvent) => {
    const text = window.getSelection()?.toString().trim() ?? '';
    setSelectedText(text);
    if (!text) return; // no selection → browser default menu

    e.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setContextMenu({ x: r.right + 8, y: r.bottom + 8 });
    } else {
      setContextMenu({ x: e.clientX + 8, y: e.clientY + 8 });
    }
  };

  // ── Close context menu on outside click / scroll ─────────────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onPointerDown = (e: PointerEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  // ── Derived values ────────────────────────────────────────────────────────
  const effectiveScale = fitWidth && containerWidth > 0 ? undefined : scale;
  const effectiveWidth = fitWidth && containerWidth > 0 ? containerWidth - 16 : undefined;
  const progress       = totalPages > 0 ? Math.round((pageNumber / totalPages) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-lumina-border-divider px-2 py-1">

        <button type="button" className={`${btn} ${viewMode === 'continuous' ? btnOn : ''}`} onClick={() => setViewMode(v => v === 'single' ? 'continuous' : 'single')} title="Single / continuous scroll">
          {viewMode === 'single' ? 'Single' : 'Scroll'}
        </button>

        <button type="button" className={btn} onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1}>←</button>
        <button type="button" className={btn} onClick={() => goTo(pageNumber + 1)} disabled={pageNumber >= totalPages}>→</button>

        <input
          type="text"
          value={pageInput}
          onChange={e => setPageInput(e.target.value)}
          onBlur={commitPageInput}
          onKeyDown={onPageInputKey}
          placeholder={`${totalPages ? pageNumber : 0}/${totalPages}`}
          className="w-20 rounded border border-lumina-border-divider px-2 py-0.5 text-center text-xs"
        />

        <span className="h-4 w-px shrink-0 bg-lumina-border-divider" />

        <button type="button" className={`${btn} ${fitWidth ? btnOn : ''}`} onClick={() => setFitWidth(v => !v)} title="Fit to width">Fit</button>

        {!fitWidth && (
          <>
            <button type="button" className={btn} onClick={() => onScaleChange(Math.max(MIN_SCALE, Number((scale - 0.1).toFixed(1))))}>−</button>
            <span className="shrink-0 text-xs text-lumina-secondary-text">{Math.round(scale * 100)}%</span>
            <button type="button" className={btn} onClick={() => onScaleChange(Math.min(MAX_SCALE, Number((scale + 0.1).toFixed(1))))}>+</button>
          </>
        )}

        <span className="h-4 w-px shrink-0 bg-lumina-border-divider" />

        <button type="button" className={`${btn} ${panel === 'toc' ? btnOn : ''}`} onClick={() => setPanel(p => p === 'toc' ? null : 'toc')}>TOC</button>
        <button type="button" className={`${btn} ${panel === 'annotations' ? btnOn : ''}`} onClick={() => setPanel(p => p === 'annotations' ? null : 'annotations')}>Notes</button>
        <button type="button" className={btn} onClick={() => addPdfBookmark({ page: pageNumber, label: `Page ${pageNumber}` })} title="Add bookmark (B)">⊕</button>
        <button type="button" className={`${btn} ${showRuler ? btnOn : ''}`} onClick={() => setShowRuler(v => !v)} title="Reading ruler (R)">—</button>
        {showRuler && (
          <button type="button" className={`${btn} ${verticalRuler ? btnOn : ''}`} onClick={() => setVerticalRuler(v => !v)} title="Toggle ruler orientation">
            {verticalRuler ? '↕' : '↔'}
          </button>
        )}
        <button type="button" className={`${btn} ${isSpeaking ? btnOn : ''}`} onClick={handleTts} title="Read aloud (T)">{isSpeaking ? '■' : '▶'}</button>

        <span className="ml-auto shrink-0 text-xs text-lumina-secondary-text">{progress}%</span>
      </div>

      {/* ── Content row ───────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">

        {panel === 'annotations' && (
          <div className="w-52 shrink-0 overflow-y-auto border-r border-lumina-border-divider bg-white">
            <AnnotationsPanel
              pdfBookmarks={pdfBookmarks}
              onJumpPdfBookmark={b => { goTo(b.page); setPanel(null); }}
              onDeletePdfBookmark={removePdfBookmark}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        <div className="relative min-w-0 flex-1 overflow-auto bg-lumina-app-background" ref={contentRef}>
          {!pdfLib ? (
            <p className="p-4 text-sm text-lumina-secondary-text">
              {rendererError ?? 'Loading PDF renderer…'}
            </p>
          ) : (
            <div className="min-h-full select-text p-2" onMouseUp={updateSelection} onContextMenu={onContextMenu}>
              <pdfLib.Document
                file={fileUrl}
                options={PDF_OPTIONS}
                onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
                onLoadError={() => setDocError('Could not open this PDF file.')}
                loading={<p className="p-4 text-sm text-lumina-secondary-text">Loading PDF…</p>}
                error={<p className="p-4 text-sm text-red-500">{docError ?? 'Failed to load.'}</p>}
              >
                {/* TOC — must be rendered inside the Document context */}
                {panel === 'toc' && (
                  <div className="absolute left-0 top-0 z-10 h-full w-52 overflow-y-auto border-r border-lumina-border-divider bg-white">
                    <div className="flex shrink-0 items-center justify-between border-b border-lumina-border-divider px-3 py-1.5">
                      <span className="text-xs font-medium">Contents</span>
                      <button type="button" onClick={() => setPanel(null)} className="text-xs text-lumina-secondary-text hover:text-lumina-primary-text">✕</button>
                    </div>
                    <div className="py-1 text-xs">
                      <pdfLib.Outline onItemClick={({ pageNumber: p }) => { goTo(p); setPanel(null); }} />
                    </div>
                  </div>
                )}

                {viewMode === 'single' ? (
                  <div className="flex justify-center">
                    <pdfLib.Page pageNumber={pageNumber} scale={effectiveScale} width={effectiveWidth} renderTextLayer renderAnnotationLayer={false} onRenderSuccess={() => saveLastPage(pageNumber)} />
                  </div>
                ) : (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <div key={n} ref={el => { pageRefs.current[n] = el; }} data-page={n} className="mb-2 flex justify-center">
                      <pdfLib.Page pageNumber={n} scale={effectiveScale} width={effectiveWidth} renderTextLayer renderAnnotationLayer={false} />
                    </div>
                  ))
                )}
              </pdfLib.Document>
            </div>
          )}

          {showRuler && (
            verticalRuler ? (
              <div className="pointer-events-none absolute inset-y-0" style={{ right: `${rulerOffset}%` }}>
                <div className="h-full w-8 border-x border-yellow-300/60 bg-yellow-200/25" />
                <div className="pointer-events-auto absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
                  <button type="button" onClick={() => setRulerOffset(v => Math.min(90, v + 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">←</button>
                  <button type="button" onClick={() => setRulerOffset(v => Math.max(5,  v - 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">→</button>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-x-0" style={{ top: `${rulerOffset}%` }}>
                <div className="h-8 border-y border-yellow-300/60 bg-yellow-200/25" />
                <div className="pointer-events-auto absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button type="button" onClick={() => setRulerOffset(v => Math.max(5,  v - 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">↑</button>
                  <button type="button" onClick={() => setRulerOffset(v => Math.min(90, v + 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">↓</button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <div className="h-0.5 shrink-0 bg-lumina-border-divider">
        <div className="h-full bg-lumina-primary-teal transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Context menu (portal) ────────────────────────────────────────── */}
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 50 }}
          className="min-w-36 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
        >
          <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            &ldquo;{selectedText.slice(0, 40)}{selectedText.length > 40 ? '…' : ''}&rdquo;
          </p>
          <div className="-mx-1 my-1 h-px bg-border" />
          <button type="button" onClick={() => { onLookup(selectedText); setContextMenu(null); }} className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">Look up in dictionary</button>
          <button type="button" onClick={() => { onAddCard(selectedText); setContextMenu(null); }} className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">Add as flashcard</button>
          <div className="-mx-1 my-1 h-px bg-border" />
          <button type="button" onClick={() => { setTranslationPopup({ text: selectedText, x: contextMenu.x, y: contextMenu.y }); setContextMenu(null); }} className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">Translate with DeepL</button>
        </div>,
        document.body,
      )}

      {translationPopup && (
        <DeepLTranslationPopup
          originalText={translationPopup.text}
          position={{ x: translationPopup.x, y: translationPopup.y }}
          onClose={() => setTranslationPopup(null)}
        />
      )}
    </div>
  );
}
