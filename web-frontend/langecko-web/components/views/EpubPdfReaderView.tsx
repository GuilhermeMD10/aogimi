'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import type { DocumentProps, PageProps } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import { FullscreenIcon } from '@/components/ui/icons/NavIcons';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useReaderState } from '@/components/providers/ReaderStateProvider';


type ReactPdfModule = typeof import('react-pdf');
type PdfDocumentComponent = (props: DocumentProps) => React.JSX.Element;
type PdfPageComponent = (props: PageProps) => React.JSX.Element;

const MAX_EPUB_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_SIZE = 100 * 1024 * 1024; // 100 MB

const pdfDocumentOptions = {
  standardFontDataUrl: '/standard_fonts/',
};

const btnBase = 'flex items-center gap-1.5 rounded border border-lumina-border-divider px-3 py-1 text-sm disabled:opacity-40';
const btnActive = 'bg-lumina-primary-teal border-lumina-primary-teal text-black';
const btnInactive = 'bg-white text-lumina-primary-text';

function truncateLabel(text: string, max = 30): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// storageKey prop is kept for API compatibility but state is managed by the
// shared ReaderStateProvider context so both routes always see the same data.
export default function EpubPdfReaderView({ storageKey: _storageKey }: { storageKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // ── Shared state (persists across route changes via context) ────────────────
  const {
    mode, setMode,
    epubFileUrl, setEpubFileUrl,
    pdfFileUrl, setPdfFileUrl,
    pdfPageNumber, setPdfPageNumber,
    pdfScale, setPdfScale,
    setPendingDictSearch,
    setPendingCardWord,
  } = useReaderState();

  // ── Local UI state (not worth sharing across routes) ───────────────────────
  const [fullscreen, setFullscreen] = useState(false);
  const [epubReloadKey, setEpubReloadKey] = useState(0);

  const [epubError, setEpubError] = useState<string | null>(null);
  const epubContainerRef = useRef<HTMLDivElement | null>(null);
  const epubInputRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfRendererError, setPdfRendererError] = useState<string | null>(null);
  const [PdfDocument, setPdfDocument] = useState<PdfDocumentComponent | null>(null);
  const [PdfPage, setPdfPage] = useState<PdfPageComponent | null>(null);

  // Selection state
  const [selectedPdfText, setSelectedPdfText] = useState('');
  const [epubSelectionMenu, setEpubSelectionMenu] = useState<{ text: string; x: number; y: number } | null>(null);
  const epubMenuRef = useRef<HTMLDivElement>(null);

  // ── Cross-tab navigation helpers ────────────────────────────────────────────

  const lookupWord = (word: string) => {
    // Store in context — DictionaryView and MainWorkspace both react to this.
    setPendingDictSearch(word);
    if (pathname === '/epub-pdf-reader') {
      router.push('/modular?left=reader&right=dictionary');
    }
    setEpubSelectionMenu(null);
  };

  const addCard = (word: string) => {
    // Store in context — CardDeckView and MainWorkspace both react to this.
    setPendingCardWord(word);
    if (pathname === '/epub-pdf-reader') {
      router.push('/modular?left=reader&right=cards');
    }
    setEpubSelectionMenu(null);
  };

  const updateSelectedPdfText = () => {
    setSelectedPdfText(window.getSelection()?.toString().trim() ?? '');
  };

  // ── EPUB load ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!epubFileUrl || !epubContainerRef.current) return;

    let cancelled = false;

    const loadEpub = async () => {
      try {
        const epubModule = await import('epubjs');
        const createEpub = epubModule.default;

        if (!createEpub || cancelled || !epubContainerRef.current) return;

        const book = createEpub(epubFileUrl);
        const rendition = book.renderTo(epubContainerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'scrolled-doc',
        });

        rendition.themes.default({
          '*': { 'user-select': 'text !important', '-webkit-user-select': 'text !important' },
        });

        bookRef.current = book;
        renditionRef.current = rendition;
        await rendition.display();

        // Track text selection inside the EPUB iframe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (_cfiRange: string, contents: any) => {
          if (cancelled) return;
          try {
            const selection: Selection | null = contents.window.getSelection();
            const text = selection?.toString().trim();
            if (!text) { setEpubSelectionMenu(null); return; }
            const range = selection!.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const iframe = epubContainerRef.current?.querySelector('iframe');
            const iframeRect = iframe?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setEpubSelectionMenu({
              text,
              x: iframeRect.left + rect.right + 4,
              y: iframeRect.top + rect.bottom + 4,
            });
          } catch { setEpubSelectionMenu(null); }
        });

        rendition.on('click', () => { if (!cancelled) setEpubSelectionMenu(null); });
      } catch {
        setEpubError('Could not open this EPUB file.');
      }
    };

    void loadEpub();

    return () => {
      cancelled = true;
      renditionRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current?.destroy();
      bookRef.current = null;
    };
  }, [epubFileUrl, epubReloadKey]);

  // Dismiss EPUB selection menu on outside click
  useEffect(() => {
    if (!epubSelectionMenu) return;
    const handler = (e: MouseEvent) => {
      if (epubMenuRef.current && !epubMenuRef.current.contains(e.target as Node)) {
        setEpubSelectionMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [epubSelectionMenu]);

  // ── PDF renderer lazy-load ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const loadPdfRenderer = async () => {
      try {
        const reactPdfModule: ReactPdfModule = await import('react-pdf');
        reactPdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${reactPdfModule.pdfjs.version}/build/pdf.worker.min.mjs`;

        if (cancelled) return;

        setPdfDocument(() => reactPdfModule.Document as PdfDocumentComponent);
        setPdfPage(() => reactPdfModule.Page as PdfPageComponent);
        setPdfRendererError(null);
      } catch {
        if (!cancelled) setPdfRendererError('Could not load PDF renderer.');
      }
    };

    void loadPdfRenderer();

    return () => { cancelled = true; };
  }, []);

  // ── File upload handlers ────────────────────────────────────────────────────

  const onEpubChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/epub+zip' && !file.name.endsWith('.epub')) {
      setEpubError('Invalid file type. Please upload an EPUB file.');
      return;
    }
    if (file.size > MAX_EPUB_SIZE) {
      setEpubError('File too large. Maximum size is 50 MB.');
      return;
    }

    setEpubError(null);
    // setEpubFileUrl revokes the previous blob URL internally.
    setEpubFileUrl(URL.createObjectURL(file));
  };

  const onPdfChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setPdfError('Invalid file type. Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setPdfError('File too large. Maximum size is 100 MB.');
      return;
    }

    setPdfError(null);
    setPdfPages(0);
    setPdfPageNumber(1);
    setPdfScale(1);
    // setPdfFileUrl revokes the previous blob URL internally.
    setPdfFileUrl(URL.createObjectURL(file));
  };

  const onPdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfError(null);
    setPdfPages(numPages);
    // Don't reset page number here — onPdfChange already resets it for new
    // uploads, and we want to preserve the page when navigating between routes.
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToNextPage = async () => { await renditionRef.current?.next(); };
  const goToPreviousPage = async () => { await renditionRef.current?.prev(); };

  const toggleFullscreen = () => {
    setFullscreen((f) => !f);
    if (mode === 'epub') setEpubReloadKey((k) => k + 1);
  };

  const activeFile = mode === 'epub' ? epubFileUrl : pdfFileUrl;
  const anyError = epubError ?? pdfError ?? pdfRendererError;

  // ── Floating selection menu for EPUB ────────────────────────────────────────
  // Rendered outside the normal flow so it appears in both fullscreen and
  // normal modes at the correct viewport position.

  const EpubSelectionMenuEl = epubSelectionMenu ? (
    <div
      ref={epubMenuRef}
      style={{ position: 'fixed', left: epubSelectionMenu.x, top: epubSelectionMenu.y, zIndex: 9999 }}
      className="min-w-36 rounded-lg border border-lumina-border-divider bg-white py-1 shadow-md"
    >
      <p className="max-w-48 truncate px-3 py-1 text-xs text-lumina-secondary-text">
        &ldquo;{truncateLabel(epubSelectionMenu.text)}&rdquo;
      </p>
      <hr className="my-1 border-lumina-border-divider" />
      <button
        type="button"
        onClick={() => lookupWord(epubSelectionMenu.text)}
        className="flex w-full items-center px-3 py-1.5 text-sm text-lumina-primary-text hover:bg-black/5"
      >
        Look up in dictionary
      </button>
      <button
        type="button"
        onClick={() => addCard(epubSelectionMenu.text)}
        className="flex w-full items-center px-3 py-1.5 text-sm text-lumina-primary-text hover:bg-black/5"
      >
        Add as flashcard
      </button>
    </div>
  ) : null;

  // ── Context menu content (PDF) ──────────────────────────────────────────────

  const PdfContextMenuContent = (
    <ContextMenuContent>
      {selectedPdfText ? (
        <>
          <ContextMenuLabel>&ldquo;{truncateLabel(selectedPdfText)}&rdquo;</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => lookupWord(selectedPdfText)}>
            Look up in dictionary
          </ContextMenuItem>
          <ContextMenuItem onClick={() => addCard(selectedPdfText)}>
            Add as flashcard
          </ContextMenuItem>
        </>
      ) : (
        <ContextMenuItem disabled>Select text to look up</ContextMenuItem>
      )}
    </ContextMenuContent>
  );

  // ── Shared nav toolbar ──────────────────────────────────────────────────────

  const NavToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {mode === 'epub' ? (
        <>
          <button type="button" onClick={goToPreviousPage} className={`${btnBase} ${btnInactive}`}>Previous</button>
          <button type="button" onClick={goToNextPage} className={`${btnBase} ${btnInactive}`}>Next</button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setPdfPageNumber((p) => Math.max(1, p - 1))} disabled={pdfPageNumber <= 1} className={`${btnBase} ${btnInactive}`}>Previous</button>
          <button type="button" onClick={() => setPdfPageNumber((p) => Math.min(pdfPages, p + 1))} disabled={pdfPageNumber >= pdfPages} className={`${btnBase} ${btnInactive}`}>Next</button>
          <span className="text-xs text-lumina-secondary-text">{pdfPages ? pdfPageNumber : 0} / {pdfPages}</span>
          <button type="button" onClick={() => setPdfScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(1))))} className={`${btnBase} ${btnInactive}`}>−</button>
          <button type="button" onClick={() => setPdfScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(1))))} className={`${btnBase} ${btnInactive}`}>+</button>
        </>
      )}

      <button
        type="button"
        onClick={toggleFullscreen}
        className={`${btnBase} ${btnInactive} ml-auto`}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        <FullscreenIcon size={14} active={fullscreen} />
        <span className="hidden sm:inline">{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
      </button>
    </div>
  );

  // ── Fullscreen render ───────────────────────────────────────────────────────

  if (fullscreen) {
    return (
      <div className="flex h-full flex-col bg-lumina-app-background rounded-2xl overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-lumina-border-divider px-3 py-1.5">
          {activeFile ? (
            mode === 'epub' ? (
              <>
                <button type="button" onClick={goToPreviousPage} className={`${btnBase} ${btnInactive}`}>Previous</button>
                <button type="button" onClick={goToNextPage} className={`${btnBase} ${btnInactive}`}>Next</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setPdfPageNumber((p) => Math.max(1, p - 1))} disabled={pdfPageNumber <= 1} className={`${btnBase} ${btnInactive}`}>Previous</button>
                <button type="button" onClick={() => setPdfPageNumber((p) => Math.min(pdfPages, p + 1))} disabled={pdfPageNumber >= pdfPages} className={`${btnBase} ${btnInactive}`}>Next</button>
                <span className="text-xs text-lumina-secondary-text">{pdfPages ? pdfPageNumber : 0} / {pdfPages}</span>
                <button type="button" onClick={() => setPdfScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(1))))} className={`${btnBase} ${btnInactive}`}>−</button>
                <button type="button" onClick={() => setPdfScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(1))))} className={`${btnBase} ${btnInactive}`}>+</button>
              </>
            )
          ) : null}

          {anyError ? (
            <span className="text-xs text-lumina-error">{anyError}</span>
          ) : null}

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`${btnBase} ${btnInactive} ml-auto`}
            aria-label="Exit fullscreen"
          >
            <FullscreenIcon size={14} active />
            <span className="hidden sm:inline">Exit fullscreen</span>
          </button>
        </div>

        <div className="flex-1 min-h-0">
          {mode === 'epub' ? (
            epubFileUrl ? (
              <div ref={epubContainerRef} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <button type="button" onClick={() => epubInputRef.current?.click()} className={`${btnBase} ${btnInactive}`}>Open EPUB file</button>
                <input ref={epubInputRef} type="file" accept=".epub,application/epub+zip" onChange={onEpubChange} className="hidden" />
              </div>
            )
          ) : (
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className="h-full overflow-auto p-2 bg-lumina-app-background select-text"
                  onMouseUp={updateSelectedPdfText}
                  onContextMenu={updateSelectedPdfText}
                >
                  {!PdfDocument || !PdfPage ? (
                    <p className="text-sm text-lumina-secondary-text">Loading PDF renderer...</p>
                  ) : !pdfFileUrl ? (
                    <div className="flex h-full items-center justify-center">
                      <button type="button" onClick={() => pdfInputRef.current?.click()} className={`${btnBase} ${btnInactive}`}>Open PDF file</button>
                      <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" onChange={onPdfChange} className="hidden" />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <PdfDocument
                        file={pdfFileUrl}
                        options={pdfDocumentOptions}
                        onLoadSuccess={onPdfLoadSuccess}
                        onLoadError={() => setPdfError('Could not open this PDF file.')}
                        loading={<p className="text-sm text-lumina-secondary-text">Loading PDF...</p>}
                      >
                        <PdfPage pageNumber={pdfPageNumber} scale={pdfScale} renderTextLayer={true} renderAnnotationLayer={false} />
                      </PdfDocument>
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              {PdfContextMenuContent}
            </ContextMenu>
          )}
        </div>

        {EpubSelectionMenuEl}
      </div>
    );
  }

  // ── Normal render ───────────────────────────────────────────────────────────

  return (
    <main className="p-6 bg-lumina-app-background rounded-2xl">
      <h1 className="text-xl font-semibold text-lumina-primary-text">EPUB / PDF Reader</h1>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setMode('epub')} className={`${btnBase} ${mode === 'epub' ? btnActive : btnInactive}`}>EPUB</button>
        <button type="button" onClick={() => setMode('pdf')} className={`${btnBase} ${mode === 'pdf' ? btnActive : btnInactive}`}>PDF</button>
      </div>

      {mode === 'epub' ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <input type="file" accept=".epub,application/epub+zip" onChange={onEpubChange} />
          <div className="mt-4">{NavToolbar}</div>
          {epubError ? <p className="mt-3 text-sm text-lumina-error">{epubError}</p> : null}
          <div className="mt-4 h-[70vh] w-full rounded border border-lumina-border-divider bg-white">
            <div ref={epubContainerRef} className="h-full w-full" />
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <input type="file" accept=".pdf,application/pdf" onChange={onPdfChange} />
          <div className="mt-4">{NavToolbar}</div>
          {pdfRendererError ? <p className="mt-3 text-sm text-lumina-error">{pdfRendererError}</p> : null}
          {pdfError ? <p className="mt-3 text-sm text-lumina-error">{pdfError}</p> : null}
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                className="mt-4 h-[70vh] w-full overflow-auto rounded border border-lumina-border-divider bg-lumina-app-background p-2 select-text"
                onMouseUp={updateSelectedPdfText}
                onContextMenu={updateSelectedPdfText}
              >
                {!PdfDocument || !PdfPage ? (
                  <p className="text-sm text-lumina-secondary-text">Loading PDF renderer...</p>
                ) : !pdfFileUrl ? (
                  <p className="text-sm text-lumina-secondary-text">Upload a PDF file to view it.</p>
                ) : (
                  <div className="flex justify-center">
                    <PdfDocument
                      file={pdfFileUrl}
                      options={pdfDocumentOptions}
                      onLoadSuccess={onPdfLoadSuccess}
                      onLoadError={() => setPdfError('Could not open this PDF file.')}
                      loading={<p className="text-sm text-lumina-secondary-text">Loading PDF...</p>}
                    >
                      <PdfPage pageNumber={pdfPageNumber} scale={pdfScale} renderTextLayer={true} renderAnnotationLayer={false} />
                    </PdfDocument>
                  </div>
                )}
              </div>
            </ContextMenuTrigger>
            {PdfContextMenuContent}
          </ContextMenu>
        </section>
      )}

      {EpubSelectionMenuEl}
    </main>
  );
}
