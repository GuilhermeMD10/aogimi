'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useReaderState } from '../providers/ReaderStateProvider';
import { useDictionaryState } from '@/features/dictionary/providers/DictionaryStateProvider';

// Routes where the dictionary surface is *always* visible; lookups skip the
// floating bubble and just feed the visible surface. An open book is
// conditional on the sidekick being docked — see `isDictSurfaceVisible`.
const ALWAYS_DICT_VISIBLE_ROUTES = new Set(['/dictionary']);

function isDictSurfaceVisible(pathname: string, sidekickOpen: boolean): boolean {
  if (ALWAYS_DICT_VISIBLE_ROUTES.has(pathname)) return true;
  // A prefix test, not equality: the reader is `/reader/<bookId>`. Matching
  // `/reader` exactly would be true only on the library shelf, which has no
  // sidekick — so every in-book lookup would pop the bubble over the panel
  // that was already showing it.
  if (pathname.startsWith('/reader/') && sidekickOpen) return true;
  return false;
}

/**
 * One-shot user-intent helpers that wrap reader-state + dictionary-state +
 * route knowledge. Producers (reader word tap, dictionary "add card") call
 * these directly instead of pushing into a pending field and waiting for an
 * effect somewhere else to act on it.
 *
 * Replaces the old `pendingDictSearch` / `pendingCard` + `fired*Ref` plumbing
 * in `AppShell` — the consumer logic now lives at the call site, gated by
 * stable function identity.
 */
export function useReaderActions() {
  const pathname = usePathname();
  const dict = useDictionaryState();
  const { setReaderBubble, setPendingCard, sidekickOpen } = useReaderState();

  const requestDictLookup = useCallback(
    (word: string, contextSentence?: string) => {
      void dict.runSearch(word, contextSentence);
      if (!isDictSurfaceVisible(pathname, sidekickOpen)) {
        setReaderBubble({ mode: 'dict' });
      }
    },
    [dict, pathname, sidekickOpen, setReaderBubble],
  );

  const requestAddCard = useCallback(
    (word: string, back?: string, contextSentence?: string) => {
      // Always open the bubble — the decks page consumes pendingCard
      // independently if mounted, mirroring the old dual-consumer behaviour.
      setReaderBubble({
        mode: 'addCard',
        word,
        back: back ?? '',
        contextSentence,
        // When a dictionary surface is already showing, the bubble must not
        // run its own lookup: the two share one `DictionaryStateProvider`, so
        // it would replace the query and results the surface behind it is
        // rendering — on /dictionary that empties the rail and drops the
        // selected entry the moment you press add.
        dictVisibleBehind: isDictSurfaceVisible(pathname, sidekickOpen),
      });
      setPendingCard({ word, back, contextSentence });
    },
    [setReaderBubble, setPendingCard, pathname, sidekickOpen],
  );

  return { requestDictLookup, requestAddCard };
}
