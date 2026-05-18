'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { BookRecord } from '@/lib/bookStore';
import { updateBookProgress, sendProgressBeacon } from '@/lib/booksApi';
import { setReaderProgress } from '@/lib/storage/readerSession';

// Previously this provider also carried "survives tab-reorder" state for the
// now-removed multi-tab workspace (reader `mode`, last-opened EPUB/PDF
// filenames, PDF page + scale). All of that was per-tab UI state and went
// away with the workspace. What's left is genuinely cross-cutting:
//   - pending signals between routes (dict search, flashcard, book-open)
//   - the dictionary sidekick toggle
//   - progress-sync wiring that listens for app-level exit events.

export type ReaderSession = {
  activeBook: BookRecord;
  fileUrl: string;
  backendBookId: string | null;
  backendCfi: string | null;
};

type ProgressSnapshot = {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

type ReaderContextValue = {
  // Cross-route pending signals — set on one page, consumed on another.
  pendingDictSearch: { word: string; contextSentence?: string } | null;
  setPendingDictSearch: React.Dispatch<React.SetStateAction<{ word: string; contextSentence?: string } | null>>;
  pendingCard: { word: string; back?: string; contextSentence?: string } | null;
  setPendingCard: React.Dispatch<React.SetStateAction<{ word: string; back?: string; contextSentence?: string } | null>>;
  /** Filename of a book the reader should auto-open on next mount (e.g. from home shortcut). */
  pendingBookOpen: string | null;
  setPendingBookOpen: React.Dispatch<React.SetStateAction<string | null>>;

  // Active reader session.
  readerSession: ReaderSession | null;
  setReaderSession: React.Dispatch<React.SetStateAction<ReaderSession | null>>;

  // Dictionary sidekick — docked on the right side of the reader page. AppShell
  // reads `sidekickOpen` so dictionary lookups dispatched from the reader bubble
  // route into the sidekick instead of opening the floating bubble when it's
  // already visible.
  sidekickOpen: boolean;
  toggleSidekick: () => void;
  setSidekickOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Progress sync — call on every page turn (localStorage only), flush on exit.
  recordProgress: (snapshot: ProgressSnapshot) => void;
  flushProgress: () => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderStateProvider({ children }: { children: React.ReactNode }) {
  const [pendingDictSearch, setPendingDictSearch] = useState<{ word: string; contextSentence?: string } | null>(null);
  const [pendingCard, setPendingCard] = useState<{ word: string; back?: string; contextSentence?: string } | null>(null);
  const [pendingBookOpen, setPendingBookOpen] = useState<string | null>(null);

  const [readerSession, setReaderSession] = useState<ReaderSession | null>(null);

  const [sidekickOpen, setSidekickOpen] = useState(false);
  const toggleSidekick = useCallback(() => setSidekickOpen((v) => !v), []);

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
    setReaderProgress(session.activeBook.filename, {
      progress: snapshot.progress,
      cfi: snapshot.cfi,
      spineIndex: snapshot.spineIndex,
      totalSpineItems: snapshot.totalSpineItems,
    });
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

  return (
    <ReaderContext.Provider
      value={{
        pendingDictSearch, setPendingDictSearch,
        pendingCard, setPendingCard,
        pendingBookOpen, setPendingBookOpen,
        readerSession, setReaderSession,
        sidekickOpen, toggleSidekick, setSidekickOpen,
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
