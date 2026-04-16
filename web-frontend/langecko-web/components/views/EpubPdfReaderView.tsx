'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FullscreenIcon } from '@/components/ui/icons/NavIcons';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { DropZone } from '@/components/reader/DropZone';
import { EpubReader } from '@/components/reader/EpubReader';
import { PdfReader } from '@/components/reader/PdfReader';

const MAX_EPUB_SIZE = 50  * 1024 * 1024;
const MAX_PDF_SIZE  = 100 * 1024 * 1024;

const validateEpub = (file: File): string | null => {
  if (file.type !== 'application/epub+zip' && !file.name.endsWith('.epub'))
    return 'Invalid file type. Please upload an EPUB file.';
  if (file.size > MAX_EPUB_SIZE)
    return 'File too large. Maximum size is 50 MB.';
  return null;
};

const validatePdf = (file: File): string | null => {
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf'))
    return 'Invalid file type. Please upload a PDF file.';
  if (file.size > MAX_PDF_SIZE)
    return 'File too large. Maximum size is 100 MB.';
  return null;
};

const btn    = 'flex items-center gap-1.5 rounded border border-lumina-border-divider px-3 py-1 text-sm';
const btnOn  = 'bg-lumina-primary-teal border-lumina-primary-teal text-black';
const btnOff = 'bg-lumina-surface-background text-lumina-primary-text hover:bg-lumina-primary-text/5';

// storageKey prop kept for API compatibility (state lives in context)
export default function EpubPdfReaderView({ storageKey: _storageKey }: { storageKey?: string }) {
  const router   = useRouter();
  const pathname = usePathname();

  const {
    mode, setMode,
    epubFileUrl, epubFilename, setEpubFile,
    pdfFileUrl,  pdfFilename,  setPdfFile,
    pdfPageNumber, setPdfPageNumber,
    pdfScale,      setPdfScale,
    setPendingDictSearch,
    setPendingCardWord,
  } = useReaderState();

  // ── Cross-tab helpers ──────────────────────────────────────────────────────
  const lookupWord = (word: string) => {
    setPendingDictSearch(word);
    if (pathname === '/epub-pdf-reader')
      router.push('/modular?left=reader&right=dictionary');
  };

  const addCard = (word: string) => {
    setPendingCardWord(word);
    if (pathname === '/epub-pdf-reader')
      router.push('/modular?left=reader&right=cards');
  };

  // ── File handlers ──────────────────────────────────────────────────────────
  const onEpubFile = (file: File) => {
    setEpubFile(URL.createObjectURL(file), file.name);
    setPdfPageNumber(1);
  };

  const onPdfFile = (file: File) => {
    setPdfFile(URL.createObjectURL(file), file.name);
    setPdfPageNumber(1);
    setPdfScale(1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-lumina-border-divider px-3 py-1.5">

        <button type="button" onClick={() => setMode('epub')} className={`${btn} ${mode === 'epub' ? btnOn : btnOff}`}>EPUB</button>
        <button type="button" onClick={() => setMode('pdf')}  className={`${btn} ${mode === 'pdf'  ? btnOn : btnOff}`}>PDF</button>

        {mode === 'epub' ? (
          <DropZone
            accept=".epub,application/epub+zip"
            validate={validateEpub}
            currentFilename={epubFileUrl ? (epubFilename ?? null) : null}
            lastFilename={!epubFileUrl ? (epubFilename ?? null) : null}
            onFile={onEpubFile}
          />
        ) : (
          <DropZone
            accept=".pdf,application/pdf"
            validate={validatePdf}
            currentFilename={pdfFileUrl ? (pdfFilename ?? null) : null}
            lastFilename={!pdfFileUrl ? (pdfFilename ?? null) : null}
            onFile={onPdfFile}
          />
        )}

        {/* Fullscreen — placeholder button, functionality not yet implemented */}
        <button
          type="button"
          disabled
          className={`${btn} ${btnOff} ml-auto cursor-not-allowed opacity-40`}
          aria-label="Fullscreen (not available)"
          title="Fullscreen coming soon"
        >
          <FullscreenIcon size={14} active={false} />
          <span className="hidden sm:inline">Fullscreen</span>
        </button>
      </div>

      {/* ── Reader content ─────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        {mode === 'epub' ? (
          epubFileUrl && epubFilename ? (
            <EpubReader fileUrl={epubFileUrl} filename={epubFilename} onLookup={lookupWord} onAddCard={addCard} />
          ) : (
            <EmptyState label="Open an EPUB file to start reading" accept=".epub,application/epub+zip" validate={validateEpub} onFile={onEpubFile} />
          )
        ) : (
          pdfFileUrl && pdfFilename ? (
            <PdfReader
              fileUrl={pdfFileUrl}
              filename={pdfFilename}
              pageNumber={pdfPageNumber}
              onPageChange={setPdfPageNumber}
              scale={pdfScale}
              onScaleChange={setPdfScale}
              onLookup={lookupWord}
              onAddCard={addCard}
            />
          ) : (
            <EmptyState label="Open a PDF file to start reading" accept=".pdf,application/pdf" validate={validatePdf} onFile={onPdfFile} />
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ label, accept, validate, onFile }: {
  label: string;
  accept: string;
  validate: (f: File) => string | null;
  onFile: (f: File) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-sm text-lumina-secondary-text">{label}</p>
      <DropZone accept={accept} validate={validate} currentFilename={null} onFile={onFile} />
    </div>
  );
}
