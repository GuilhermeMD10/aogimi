'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

export type ReaderMode = 'epub' | 'pdf';

type ReaderContextValue = {
  mode: ReaderMode;
  setMode: React.Dispatch<React.SetStateAction<ReaderMode>>;
  epubFileUrl: string | null;
  /** Call with the newly created blob URL; the context revokes the previous one. */
  setEpubFileUrl: (url: string | null) => void;
  pdfFileUrl: string | null;
  /** Call with the newly created blob URL; the context revokes the previous one. */
  setPdfFileUrl: (url: string | null) => void;
  pdfPageNumber: number;
  setPdfPageNumber: React.Dispatch<React.SetStateAction<number>>;
  pdfScale: number;
  setPdfScale: React.Dispatch<React.SetStateAction<number>>;
  /** Word queued for dictionary lookup. Set by the reader; consumed by DictionaryView. */
  pendingDictSearch: string | null;
  setPendingDictSearch: React.Dispatch<React.SetStateAction<string | null>>;
  /** Word queued for flashcard creation. Set by the reader; consumed by CardDeckView. */
  pendingCardWord: string | null;
  setPendingCardWord: React.Dispatch<React.SetStateAction<string | null>>;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

const STORAGE_KEY = 'reader_shared_state';

export function ReaderStateProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ReaderMode>('epub');
  const [epubFileUrl, setEpubFileUrlState] = useState<string | null>(null);
  const [pdfFileUrl, setPdfFileUrlState] = useState<string | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);
  const [pendingDictSearch, setPendingDictSearch] = useState<string | null>(null);
  const [pendingCardWord, setPendingCardWord] = useState<string | null>(null);

  // Track the live blob URLs so we can revoke them when replaced or on unmount.
  const epubUrlRef = useRef<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const persistReadyRef = useRef(false);

  // Restore non-file state from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { mode?: ReaderMode; pdfPageNumber?: number; pdfScale?: number };
      if (saved.mode) setMode(saved.mode);
      if (saved.pdfPageNumber) setPdfPageNumber(saved.pdfPageNumber);
      if (saved.pdfScale) setPdfScale(saved.pdfScale);
    } catch { /* ignore */ }
  }, []);

  // Persist non-file state to localStorage whenever it changes.
  useEffect(() => {
    if (!persistReadyRef.current) { persistReadyRef.current = true; return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, pdfPageNumber, pdfScale }));
    } catch { /* ignore */ }
  }, [mode, pdfPageNumber, pdfScale]);

  // Revoke all blob URLs when the provider unmounts (app/tab close).
  useEffect(() => {
    return () => {
      if (epubUrlRef.current) URL.revokeObjectURL(epubUrlRef.current);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const setEpubFileUrl = (url: string | null) => {
    if (epubUrlRef.current && epubUrlRef.current !== url) {
      URL.revokeObjectURL(epubUrlRef.current);
    }
    epubUrlRef.current = url;
    setEpubFileUrlState(url);
  };

  const setPdfFileUrl = (url: string | null) => {
    if (pdfUrlRef.current && pdfUrlRef.current !== url) {
      URL.revokeObjectURL(pdfUrlRef.current);
    }
    pdfUrlRef.current = url;
    setPdfFileUrlState(url);
  };

  return (
    <ReaderContext.Provider value={{
      mode, setMode,
      epubFileUrl, setEpubFileUrl,
      pdfFileUrl, setPdfFileUrl,
      pdfPageNumber, setPdfPageNumber,
      pdfScale, setPdfScale,
      pendingDictSearch, setPendingDictSearch,
      pendingCardWord, setPendingCardWord,
    }}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReaderState() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error('useReaderState must be used within ReaderStateProvider');
  return ctx;
}
