'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { BookRecord } from '@/lib/bookStore';
import { updateBookProgress, sendProgressBeacon, type ProgressPayload } from '@/lib/booksApi';

export type ReaderMode = 'epub' | 'pdf';

// ── Reader session — active book state that survives tab reordering ─────────

export type ReaderSession = {
  activeBook: BookRecord;
  fileUrl: string;
  backendBookId: string | null;
  backendCfi: string | null;
};

// ── Progress sync ref — latest values tracked for flush ─────────────────────

type ProgressSnapshot = {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

// ── Context shape ───────────────────────────────────────────────────────────

type ReaderContextValue = {
  mode: ReaderMode;
  setMode: React.Dispatch<React.SetStateAction<ReaderMode>>;

  epubFileUrl: string | null;
  epubFilename: string | null;
  setEpubFile: (url: string | null, filename: string | null) => void;

  pdfFileUrl: string | null;
  pdfFilename: string | null;
  setPdfFile: (url: string | null, filename: string | null) => void;

  pdfPageNumber: number;
  setPdfPageNumber: React.Dispatch<React.SetStateAction<number>>;
  pdfScale: number;
  setPdfScale: React.Dispatch<React.SetStateAction<number>>;

  pendingDictSearch: { word: string; contextSentence?: string } | null;
  setPendingDictSearch: React.Dispatch<React.SetStateAction<{ word: string; contextSentence?: string } | null>>;
  pendingCard: { word: string; back?: string; contextSentence?: string } | null;
  setPendingCard: React.Dispatch<React.SetStateAction<{ word: string; back?: string; contextSentence?: string } | null>>;

  /** Filename of a book the reader should auto-open on next mount (e.g. from home shortcut). */
  pendingBookOpen: string | null;
  setPendingBookOpen: React.Dispatch<React.SetStateAction<string | null>>;

  // Reader session — persists across tab reorder
  readerSession: ReaderSession | null;
  setReaderSession: React.Dispatch<React.SetStateAction<ReaderSession | null>>;

  // Progress sync — call on every page turn (localStorage only), flush on exit
  recordProgress: (snapshot: ProgressSnapshot) => void;
  flushProgress: () => void;
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
  const [pendingDictSearch, setPendingDictSearch] = useState<{ word: string; contextSentence?: string } | null>(null);
  const [pendingCard,   setPendingCard]   = useState<{ word: string; back?: string; contextSentence?: string } | null>(null);
  const [pendingBookOpen, setPendingBookOpen] = useState<string | null>(null);

  // Reader session — survives tab reorder
  const [readerSession, setReaderSession] = useState<ReaderSession | null>(null);

  const epubUrlRef = useRef<string | null>(null);
  const pdfUrlRef  = useRef<string | null>(null);
  const persistReadyRef = useRef(false);

  // ── Progress sync refs ────────────────────────────────────────────────
  const latestProgressRef = useRef<ProgressSnapshot | null>(null);
  const lastSyncedRef = useRef<{ progress: number; cfi: string } | null>(null);
  const readerSessionRef = useRef(readerSession);
  readerSessionRef.current = readerSession;

  /** Save progress to localStorage on every page turn. No network. */
  const recordProgress = useCallback((snapshot: ProgressSnapshot) => {
    latestProgressRef.current = snapshot;
    const session = readerSessionRef.current;
    if (!session?.activeBook) return;
    try {
      localStorage.setItem(
        `reader_progress_${session.activeBook.filename}`,
        JSON.stringify({
          progress: snapshot.progress,
          cfi: snapshot.cfi,
          spineIndex: snapshot.spineIndex,
          totalSpineItems: snapshot.totalSpineItems,
          updatedAt: Date.now(),
        }),
      );
    } catch { /* quota */ }
  }, []);

  /** Flush latest progress to backend via fetch. */
  const flushProgress = useCallback(() => {
    const session = readerSessionRef.current;
    const latest = latestProgressRef.current;
    if (!session?.backendBookId || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfi) return;

    lastSyncedRef.current = { progress: latest.progress, cfi: latest.cfi };
    updateBookProgress(session.backendBookId, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    }).catch(() => { /* non-critical */ });
  }, []);

  /** Flush via sendBeacon (survives page teardown). */
  const beaconFlush = useCallback(() => {
    const session = readerSessionRef.current;
    const latest = latestProgressRef.current;
    if (!session?.backendBookId || !latest) return;

    const last = lastSyncedRef.current;
    if (last && last.progress === latest.progress && last.cfi === latest.cfi) return;

    lastSyncedRef.current = { progress: latest.progress, cfi: latest.cfi };
    sendProgressBeacon(session.backendBookId, {
      cfiPosition: latest.cfi,
      progress: latest.progress,
      spineIndex: latest.spineIndex,
      totalSpineItems: latest.totalSpineItems,
    });
  }, []);

  // ── Exit-event listeners — sync to backend on close/hide ──────────────
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') flushProgress();
    };
    const onPageHide = () => beaconFlush();

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushProgress, beaconFlush]);

  // ── Restore non-file state from localStorage ──────────────────────────
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
        pendingCard, setPendingCard,
        pendingBookOpen, setPendingBookOpen,
        readerSession, setReaderSession,
        recordProgress, flushProgress,
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
