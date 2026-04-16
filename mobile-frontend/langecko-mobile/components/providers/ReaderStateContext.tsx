import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Cross-tab reader state.
 *
 * Mobile keeps the loaded EPUB/PDF bytes *inside* `ReaderScreen` itself (they
 * are huge base64 strings and shouldn't leak into a shared context), so this
 * provider is intentionally thinner than the web's `ReaderStateProvider`. It
 * only carries the values that need to survive a tab switch:
 *
 *   - `pendingCardWord`  — set from the reader's SelectionActionSheet when
 *                           "Add card" is tapped; consumed by CardDeckScreen
 *                           to pre-seed the new card's front.
 *   - `pendingDictSearch` — seeds DictionaryPage with a query when the user
 *                           navigates there from the reader (via the full-page
 *                           dictionary tab, not the overlay drawer).
 *
 * Both are one-shot queues: consumers read then clear them.
 */
interface ReaderStateValue {
  pendingCardWord: string | null;
  setPendingCardWord: (value: string | null) => void;
  pendingDictSearch: string | null;
  setPendingDictSearch: (value: string | null) => void;
}

const ReaderStateCtx = createContext<ReaderStateValue | null>(null);

export function ReaderStateProvider({ children }: { children: ReactNode }) {
  const [pendingCardWord, setPendingCardWord] = useState<string | null>(null);
  const [pendingDictSearch, setPendingDictSearch] = useState<string | null>(null);

  const setCard = useCallback((v: string | null) => setPendingCardWord(v), []);
  const setDict = useCallback((v: string | null) => setPendingDictSearch(v), []);

  const value = useMemo<ReaderStateValue>(
    () => ({
      pendingCardWord,
      setPendingCardWord: setCard,
      pendingDictSearch,
      setPendingDictSearch: setDict,
    }),
    [pendingCardWord, pendingDictSearch, setCard, setDict],
  );

  return <ReaderStateCtx.Provider value={value}>{children}</ReaderStateCtx.Provider>;
}

export function useReaderState(): ReaderStateValue {
  const ctx = useContext(ReaderStateCtx);
  if (!ctx) throw new Error('useReaderState must be used inside <ReaderStateProvider>');
  return ctx;
}
