'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import type { DocumentProps, PageProps } from 'react-pdf';

type ReaderMode = 'epub' | 'pdf';
type ReactPdfModule = typeof import('react-pdf');
type PdfDocumentComponent = (props: DocumentProps) => React.JSX.Element;
type PdfPageComponent = (props: PageProps) => React.JSX.Element;
const pdfDocumentOptions = {
  standardFontDataUrl: '/standard_fonts/',
};

export default function EpubPdfReaderPage() {
  const [mode, setMode] = useState<ReaderMode>('epub');

  const [epubFileUrl, setEpubFileUrl] = useState<string | null>(null);
  const [epubError, setEpubError] = useState<string | null>(null);
  const epubObjectUrlRef = useRef<string | null>(null);
  const epubContainerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
  const pdfObjectUrlRef = useRef<string | null>(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfRendererError, setPdfRendererError] = useState<string | null>(null);
  const [PdfDocument, setPdfDocument] = useState<PdfDocumentComponent | null>(null);
  const [PdfPage, setPdfPage] = useState<PdfPageComponent | null>(null);

  useEffect(() => {
    if (!epubFileUrl || !epubContainerRef.current) {
      return;
    }

    let cancelled = false;

    const loadEpub = async () => {
      try {
        const epubModule = await import('epubjs');
        const createEpub = epubModule.default;

        if (!createEpub || cancelled || !epubContainerRef.current) {
          return;
        }

        const book = createEpub(epubFileUrl);
        const rendition = book.renderTo(epubContainerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'scrolled-doc',
        });

        bookRef.current = book;
        renditionRef.current = rendition;
        await rendition.display();
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
  }, [epubFileUrl]);

  useEffect(() => {
    let cancelled = false;

    const loadPdfRenderer = async () => {
      try {
        const reactPdfModule: ReactPdfModule = await import('react-pdf');
        reactPdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${reactPdfModule.pdfjs.version}/build/pdf.worker.min.mjs`;

        if (cancelled) {
          return;
        }

        setPdfDocument(() => reactPdfModule.Document as PdfDocumentComponent);
        setPdfPage(() => reactPdfModule.Page as PdfPageComponent);
        setPdfRendererError(null);
      } catch {
        if (!cancelled) {
          setPdfRendererError('Could not load PDF renderer.');
        }
      }
    };

    void loadPdfRenderer();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (epubObjectUrlRef.current) {
        URL.revokeObjectURL(epubObjectUrlRef.current);
      }
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
      }
    };
  }, []);

  const onEpubChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setEpubError(null);

    if (epubObjectUrlRef.current) {
      URL.revokeObjectURL(epubObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    epubObjectUrlRef.current = objectUrl;
    setEpubFileUrl(objectUrl);
  };

  const goToNextPage = async () => {
    if (!renditionRef.current) {
      return;
    }

    await renditionRef.current.next();
  };

  const goToPreviousPage = async () => {
    if (!renditionRef.current) {
      return;
    }

    await renditionRef.current.prev();
  };

  const onPdfChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPdfError(null);
    setPdfPages(0);
    setPdfPageNumber(1);
    setPdfScale(1);

    if (pdfObjectUrlRef.current) {
      URL.revokeObjectURL(pdfObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    pdfObjectUrlRef.current = objectUrl;
    setPdfFileUrl(objectUrl);
  };

  const onPdfLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfError(null);
    setPdfPages(numPages);
    setPdfPageNumber(1);
  };

  return (
    <main className=" p-6 bg-lumina-app-background rounded-2xl">
      <h1 className="text-2xl font-semibold text-lumina-primary-text">EPUB / PDF Reader</h1>
      <p className="mt-1 text-sm text-lumina-secondary-text">Simple reader using epubjs and react-pdf.</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('epub')}
          className={`rounded border px-3 py-1 text-sm ${
            mode === 'epub'
              ? 'bg-lumina-primary-teal text-white border-lumina-primary-teal'
              : 'bg-white text-lumina-primary-text border-lumina-border-divider'
          }`}
        >
          EPUB
        </button>
        <button
          type="button"
          onClick={() => setMode('pdf')}
          className={`rounded border px-3 py-1 text-sm ${
            mode === 'pdf'
              ? 'bg-lumina-primary-teal text-white border-lumina-primary-teal'
              : 'bg-white text-lumina-primary-text border-lumina-border-divider'
          }`}
        >
          PDF
        </button>
      </div>

      {mode === 'epub' ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <input type="file" accept=".epub,application/epub+zip" onChange={onEpubChange} />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={goToPreviousPage}
              className="rounded border border-lumina-border-divider px-3 py-1 text-sm"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={goToNextPage}
              className="rounded border border-lumina-border-divider px-3 py-1 text-sm"
            >
              Next
            </button>
          </div>
          {epubError ? <p className="mt-3 text-sm text-lumina-error">{epubError}</p> : null}
          <div className="mt-4 h-[70vh] w-full rounded border border-lumina-border-divider bg-white">
            <div ref={epubContainerRef} className="h-full w-full" />
          </div>
        </section>
      ) : (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <input type="file" accept=".pdf,application/pdf" onChange={onPdfChange} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPdfPageNumber((page) => Math.max(1, page - 1))}
              disabled={!pdfFileUrl || pdfPageNumber <= 1}
              className="rounded border border-lumina-border-divider px-3 py-1 text-sm disabled:opacity-40"
            >
              Previous Page
            </button>
            <button
              type="button"
              onClick={() => setPdfPageNumber((page) => Math.min(pdfPages, page + 1))}
              disabled={!pdfFileUrl || pdfPageNumber >= pdfPages}
              className="rounded border border-lumina-border-divider px-3 py-1 text-sm disabled:opacity-40"
            >
              Next Page
            </button>
            <span className="text-sm text-lumina-secondary-text">
              Page {pdfPages ? pdfPageNumber : 0} of {pdfPages}
            </span>
            <button
              type="button"
              onClick={() => setPdfScale((scale) => Math.max(0.6, Number((scale - 0.1).toFixed(1))))}
              disabled={!pdfFileUrl}
              className="rounded border border-lumina-border-divider px-3 py-1 text-sm disabled:opacity-40"
            >
              Zoom -
            </button>
            <button
              type="button"
              onClick={() => setPdfScale((scale) => Math.min(2.5, Number((scale + 0.1).toFixed(1))))}
              disabled={!pdfFileUrl}
              className="rounded border border-lumina-border-divider px-3 py-1 text-sm disabled:opacity-40"
            >
              Zoom +
            </button>
          </div>
          {pdfRendererError ? <p className="mt-3 text-sm text-lumina-error">{pdfRendererError}</p> : null}
          {pdfError ? <p className="mt-3 text-sm text-lumina-error">{pdfError}</p> : null}
          <div className="mt-4 h-[70vh] w-full overflow-auto rounded border border-lumina-border-divider bg-lumina-app-background p-2">
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
                  <PdfPage
                    pageNumber={pdfPageNumber}
                    scale={pdfScale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </PdfDocument>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
