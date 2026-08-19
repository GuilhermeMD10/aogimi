'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { CardDraft } from '@/features/sky/stage';

// Everything in this provider is genuinely cross-cutting:
//   - the reader bubble overlay
//   - the dictionary sidekick toggle
//   - the pending flashcard hand-off to /sky
//
// The open book is deliberately NOT here. The reader is `/reader/[bookId]`,
// so the id in the URL *is* the session: `ReaderView` resolves the file, the
// restore anchor and the progress sync from it, and anything wanting to open
// a book links to the route.
//
// Producers reach the dict/card state through `useReaderActions` — see that file.

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
 *   pre-populated with the captured `word` and, when the request came from
 *   a dictionary entry, the whole `draft`. The same payload is also written
 *   to `pendingCard` so a navigation to /sky can pick it up; both
 *   consumers are intentional (bubble = inline finish, pendingCard =
 *   navigate to finish).
 *
 * Producers should call `useReaderActions` rather than touching this
 * state directly — that hook routes the request to the right surface
 * based on the active page and the sidekick state.
 */
export type ReaderBubbleState =
  | { mode: 'dict' }
  | {
      mode: 'addCard';
      /** The card front. Kept alongside `draft` rather than folded into it
       *  because the bubble needs it before a draft exists: it is the remount
       *  key, the query for the bubble's own initial lookup, and — for a card
       *  started from a raw reader selection — the only thing known at all. */
      word: string;
      /** The dictionary entry's fields, or `null` when the request came from a
       *  raw reader selection and nothing has been looked up yet. Never a blank
       *  draft: `useCardPrefill` distinguishes "no draft" from "a draft that
       *  happens to be empty" and a blank one would permanently disable its
       *  fallback fetch. `null` means "the prefill will supply the fields". */
      draft: CardDraft | null;
      /** The sentence the selection came from, for a card started in the book.
       *
       *  A sibling of `word` rather than a field of `draft` for exactly the same
       *  reason `word` is one: it is a fact about the *selection*, known before
       *  any entry has been resolved, and a selection-started card's `draft` is
       *  `null`. The bubble needs it twice — it seeds `runSearch`'s
       *  `readerContext`, which is what lets `contextForEntry` attach the book
       *  sentence to the right row of the bubble's own dictionary, and it seeds
       *  the create-card form's context field. Folding it into `draft` would
       *  drop it on every reader-started card. An entry-started card carries its
       *  context inside `draft.contextSentence` instead, already resolved
       *  against this one by `contextForEntry`. */
      contextSentence?: string;
      /** True when a dictionary surface is already on screen behind the
       *  bubble (`/dictionary`, or the reader with the sidekick docked). The
       *  bubble then skips its own lookup — running one would overwrite the
       *  shared `DictionaryStateProvider` search that the surface behind it is
       *  rendering from, blanking its results mid-add. Set by
       *  `useReaderActions`, which is the only thing that knows the route. */
      dictVisibleBehind?: boolean;
    };

/**
 * The add-card hand-off to `/sky`.
 *
 * Declared once and referenced by the getter, the setter and the `useState`
 * below, so the sites can't drift apart on the payload's shape.
 */
export type PendingCard = {
  word: string;
  draft: CardDraft | null;
  /** The book sentence the word was selected in.
   *
   *  **Carried beside `draft`, not inside it, for the same reason `word` is.** A
   *  card started from a raw selection has `draft: null` — there is no draft for
   *  the sentence to ride in — so folding this into the draft would silently
   *  blank the context on exactly the path that always has one. A card started
   *  from a dictionary entry has already had its context resolved into
   *  `draft.contextSentence` by `contextForEntry`, so this is undefined there and
   *  the consumer prefers the draft's own value. */
  contextSentence?: string;
};

type ReaderContextValue = {
  // Pending flashcard hand-off for `SkyView` — set by
  // `requestAddCardFrom*`, read-and-cleared by the decks page on mount.
  pendingCard: PendingCard | null;
  setPendingCard: React.Dispatch<React.SetStateAction<PendingCard | null>>;

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
  const [pendingCard, setPendingCard] = useState<PendingCard | null>(null);
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
