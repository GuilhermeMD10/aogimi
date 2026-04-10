'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type ReaderMode = 'epub' | 'pdf';

type ReaderContextValue = {
  mode: ReaderMode;
  setMode: React.Dispatch<React.SetStateAction<ReaderMode>>;

  epubFileUrl: string | null;
  epubFilename: string | null;
  setEpubFile: (url: string | null, filename: string | null) => void;

  pdfFileUrl: string | null;
  pdfFilename: string | null;
  setPdfFile: (url: string | null, filename: string | null) => void;

  /** Shared across routes so the page survives navigation. */
  pdfPageNumber: number;
  setPdfPageNumber: React.Dispatch<React.SetStateAction<number>>;
  pdfScale: number;
  setPdfScale: React.Dispatch<React.SetStateAction<number>>;

  pendingDictSearch: string | null;
  setPendingDictSearch: React.Dispatch<React.SetStateAction<string | null>>;
  pendingCardWord: string | null;
  setPendingCardWord: React.Dispatch<React.SetStateAction<string | null>>;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

const STORAGE_KEY = 'reader_shared_state';

type PersistedState = {
  mode?: ReaderMode;
  pdfPageNumber?: number;
  pdfScale?: number;
  lastEpubFilename?: string;
  lastPdfFilename?: string;
};

export function ReaderStateProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ReaderMode>('epub');
  const [epubFileUrl,  setEpubFileUrlState]  = useState<string | null>(null);
  const [epubFilename, setEpubFilenameState] = useState<string | null>(null);
  const [pdfFileUrl,   setPdfFileUrlState]   = useState<string | null>(null);
  const [pdfFilename,  setPdfFilenameState]  = useState<string | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale,      setPdfScale]      = useState(1);
  const [pendingDictSearch, setPendingDictSearch] = useState<string | null>(null);
  const [pendingCardWord,   setPendingCardWord]   = useState<string | null>(null);

  const epubUrlRef = useRef<string | null>(null);
  const pdfUrlRef  = useRef<string | null>(null);
  const persistReadyRef = useRef(false);

  // Restore non-file state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as PersistedState;
      if (s.mode)          setMode(s.mode);
      if (s.pdfPageNumber) setPdfPageNumber(s.pdfPageNumber);
      if (s.pdfScale)      setPdfScale(s.pdfScale);
      if (s.lastEpubFilename) setEpubFilenameState(s.lastEpubFilename);
      if (s.lastPdfFilename)  setPdfFilenameState(s.lastPdfFilename);
    } catch { /* ignore */ }
  }, []);

  // Persist non-file state
  useEffect(() => {
    if (!persistReadyRef.current) { persistReadyRef.current = true; return; }
    try {
      const s: PersistedState = {
        mode,
        pdfPageNumber,
        pdfScale,
        lastEpubFilename: epubFilename ?? undefined,
        lastPdfFilename:  pdfFilename  ?? undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* ignore */ }
  }, [mode, pdfPageNumber, pdfScale, epubFilename, pdfFilename]);

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      if (epubUrlRef.current) URL.revokeObjectURL(epubUrlRef.current);
      if (pdfUrlRef.current)  URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const setEpubFile = (url: string | null, filename: string | null) => {
    if (epubUrlRef.current && epubUrlRef.current !== url)
      URL.revokeObjectURL(epubUrlRef.current);
    epubUrlRef.current = url;
    setEpubFileUrlState(url);
    setEpubFilenameState(filename);
  };

  const setPdfFile = (url: string | null, filename: string | null) => {
    if (pdfUrlRef.current && pdfUrlRef.current !== url)
      URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = url;
    setPdfFileUrlState(url);
    setPdfFilenameState(filename);
  };

  return (
    <ReaderContext.Provider
      value={{
        mode, setMode,
        epubFileUrl, epubFilename, setEpubFile,
        pdfFileUrl,  pdfFilename,  setPdfFile,
        pdfPageNumber, setPdfPageNumber,
        pdfScale, setPdfScale,
        pendingDictSearch, setPendingDictSearch,
        pendingCardWord,   setPendingCardWord,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
}

export function useReaderState() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error('useReaderState must be used within ReaderStateProvider');
  return ctx;
}
