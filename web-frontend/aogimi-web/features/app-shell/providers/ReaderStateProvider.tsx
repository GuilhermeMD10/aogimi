'use client';

import { createContext, useCallback, useContext, useState } from 'react';

// What's left in this provider is genuinely cross-cutting:
//   - the reader bubble overlay
//   - the dictionary sidekick toggle
//   - the pending flashcard hand-off to /decks
//
// The open book is NOT here any more. It used to be a `readerSession` object
// plus a `pendingBookOpen` filename that a mounted library view watched for —
// both of which existed only because the reader was state inside the library
// screen. The reader is `/reader/[bookId]` now, so the id in the URL *is* the
// session: `ReaderView` resolves the file, the restore anchor and the progress
// sync from it, and anything wanting to open a book links to the route.
//
// Dict/card pending fields collapsed into `useReaderActions` — see that file.

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
  | {
      mode: 'addCard';
      word: string;
      back: string;
      contextSentence?: string;
      /** True when a dictionary surface is already on screen behind the
       *  bubble (`/dictionary`, or the reader with the sidekick docked). The
       *  bubble then skips its own lookup — running one would overwrite the
       *  shared `DictionaryStateProvider` search that the surface behind it is
       *  rendering from, blanking its results mid-add. Set by
       *  `useReaderActions`, which is the only thing that knows the route. */
      dictVisibleBehind?: boolean;
    };

type ReaderContextValue = {
  // Pending flashcard hand-off for `DecksView` — set by `requestAddCard`,
  // read-and-cleared by the decks page on mount.
  pendingCard: { word: string; back?: string; contextSentence?: string } | null;
  setPendingCard: React.Dispatch<React.SetStateAction<{ word: string; back?: string; contextSentence?: string } | null>>;

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
  const [readerBubble, setReaderBubble] = useState<ReaderBubbleState | null>(null);

  const [sidekickOpen, setSidekickOpen] = useState(false);
  const toggleSidekick = useCallback(() => setSidekickOpen((v) => !v), []);

  return (
    <ReaderContext.Provider
      value={{
        pendingCard, setPendingCard,
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
