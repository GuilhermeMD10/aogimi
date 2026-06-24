'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { BookRecord } from '@/components/books/utils/bookStore';

// What's left in this provider is genuinely cross-cutting:
//   - the active reader session + bubble overlay
//   - the dictionary sidekick toggle
//   - the pending flashcard hand-off to /decks
//   - the auto-open-book signal for cross-route shortcuts
// Progress sync (refs, flush, beacon, exit listeners) moved into
// `components/views/ReaderView/useProgressSync.ts` since only `ReaderView`
// and its children consumed it. Dict/card pending fields collapsed into
// `useReaderActions` — see that file.

export type ReaderSession = {
  activeBook: BookRecord;
  fileUrl: string;
  backendBookId: string | null;
  backendCfi: string | null;
};

/**
 * Overlay state for the reader's right-edge bubble. Two mutually-exclusive
 * modes share the slot:
 *
 * - `'dict'` — bubble shows the dictionary surface. The *content*
 *   (query, results, selected word) lives in `DictionaryStateProvider`;
 *   this state only controls visibility. AppShell reads `mode === 'dict'`,
 *   renders the bubble shell, and the shell reads `useDictionaryState()`
 *   for the actual rendering.
 *
 * - `'addCard'` — bubble shows the "add this word to a deck" form,
 *   pre-populated with the captured `word`, optional `back`, and
 *   `contextSentence`. The same payload is also written to `pendingCard`
 *   so a navigation to /decks can pick it up; both consumers are
 *   intentional (bubble = inline finish, pendingCard = navigate to
 *   finish).
 *
 * Producers should call `useReaderActions` rather than touching this
 * state directly — that hook routes the request to the right surface
 * based on the active page and the sidekick state.
 */
export type ReaderBubbleState =
  | { mode: 'dict' }
  | { mode: 'addCard'; word: string; back: string; contextSentence?: string };

type ReaderContextValue = {
  // Pending flashcard hand-off for `DecksView` — set by `requestAddCard`,
  // read-and-cleared by the decks page on mount.
  pendingCard: { word: string; back?: string; contextSentence?: string } | null;
  setPendingCard: React.Dispatch<React.SetStateAction<{ word: string; back?: string; contextSentence?: string } | null>>;
  /** Filename of a book the reader should auto-open on next mount (e.g. from home shortcut). */
  pendingBookOpen: string | null;
  setPendingBookOpen: React.Dispatch<React.SetStateAction<string | null>>;

  // Active reader session.
  readerSession: ReaderSession | null;
  setReaderSession: React.Dispatch<React.SetStateAction<ReaderSession | null>>;

  // Right-edge reader bubble (dict lookup or add-card flow). Lives here so
  // producers can open it via `useReaderActions` without a pending-field
  // handshake.
  readerBubble: ReaderBubbleState | null;
  setReaderBubble: React.Dispatch<React.SetStateAction<ReaderBubbleState | null>>;

  // Dictionary sidekick — docked on the right side of the reader page.
  // `useReaderActions` reads `sidekickOpen` to decide whether a dict lookup
  // should open the bubble or just route into the visible sidekick.
  sidekickOpen: boolean;
  toggleSidekick: () => void;
  setSidekickOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderStateProvider({ children }: { children: React.ReactNode }) {
  const [pendingCard, setPendingCard] = useState<{ word: string; back?: string; contextSentence?: string } | null>(null);
  const [pendingBookOpen, setPendingBookOpen] = useState<string | null>(null);

  const [readerSession, setReaderSession] = useState<ReaderSession | null>(null);
  const [readerBubble, setReaderBubble] = useState<ReaderBubbleState | null>(null);

  const [sidekickOpen, setSidekickOpen] = useState(false);
  const toggleSidekick = useCallback(() => setSidekickOpen((v) => !v), []);

  return (
    <ReaderContext.Provider
      value={{
        pendingCard, setPendingCard,
        pendingBookOpen, setPendingBookOpen,
        readerSession, setReaderSession,
        readerBubble, setReaderBubble,
        sidekickOpen, toggleSidekick, setSidekickOpen,
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
