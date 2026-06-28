'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useReaderState } from './ReaderStateProvider';
import { useDictionaryState } from '@/features/dictionary/providers/DictionaryStateProvider';

// Routes where the dictionary surface is *always* visible; lookups skip the
// floating bubble and just feed the visible surface. `/reader` is conditional
// on the sidekick being open — see `isDictSurfaceVisible`.
const ALWAYS_DICT_VISIBLE_ROUTES = new Set(['/dictionary']);

function isDictSurfaceVisible(pathname: string, sidekickOpen: boolean): boolean {
  if (ALWAYS_DICT_VISIBLE_ROUTES.has(pathname)) return true;
  if (pathname === '/reader' && sidekickOpen) return true;
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
      });
      setPendingCard({ word, back, contextSentence });
    },
    [setReaderBubble, setPendingCard],
  );

  return { requestDictLookup, requestAddCard };
}
