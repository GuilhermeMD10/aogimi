'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useReaderState } from '../providers/ReaderStateProvider';
import { useDictionaryState } from '@/features/dictionary/providers/DictionaryStateProvider';
import type { CardDraft } from '@/features/study/decks';

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

  // The one thing both add-card entry points share: open the bubble and seed
  // the /decks hand-off with the same payload.
  const openAddCard = useCallback(
    (word: string, draft: CardDraft | null, contextSentence?: string) => {
      // Always open the bubble — the decks page consumes pendingCard
      // independently if mounted, mirroring the old dual-consumer behaviour.
      setReaderBubble({
        mode: 'addCard',
        word,
        draft,
        contextSentence,
        // When a dictionary surface is already showing, the bubble must not
        // run its own lookup: the two share one `DictionaryStateProvider`, so
        // it would replace the query and results the surface behind it is
        // rendering — on /dictionary that empties the rail and drops the
        // selected entry the moment you press add.
        dictVisibleBehind: isDictSurfaceVisible(pathname, sidekickOpen),
      });
      setPendingCard({ word, draft, contextSentence });
    },
    [setReaderBubble, setPendingCard, pathname, sidekickOpen],
  );

  /**
   * Add a card from a dictionary entry — the rail's row buttons and both
   * detail panes. The draft is complete at click time, so the bubble opens
   * straight onto deck selection with every field already known.
   */
  const requestAddCardFromEntry = useCallback(
    // The draft's own `contextSentence` has already been resolved against the
    // reader sentence by `contextForEntry` at the call site, so there is nothing
    // to pass alongside it here.
    (draft: CardDraft) => openAddCard(draft.front, draft),
    [openAddCard],
  );

  /**
   * Add a card from a raw selection in the book — the reader engines and the
   * text context menu. These genuinely have no entry data at click time: the
   * user highlighted a surface string and the menu has to open *now*, so there
   * is nothing to look up yet. `useCardPrefill` resolves the rest while the
   * user is picking a deck.
   */
  const requestAddCardFromSelection = useCallback(
    // `draft: null`, not a blank draft — see the note below the return.
    (word: string, contextSentence?: string) => openAddCard(word, null, contextSentence),
    [openAddCard],
  );

  // ── Why two actions and not one `requestAddCard(draft)` ──────────────────
  //
  // A single object-arg action would force every selection-started caller —
  // `ReaderView`, and through it all six engines — to invent a synthetic blank
  // draft (`{ front: word, reading: '', meanings: [], jlptLevel: null }`) just
  // to satisfy the signature. Downstream then has to tell that blank apart from
  // a real draft that happens to have no reading and no glosses, and the only
  // available test is a falsy check on one of its fields. That check is exactly
  // the bug `useCardPrefill` guards against: a truthy-tested prefill result
  // silently disabled the fallback fetch, with no type error to show for it.
  //
  // With the split, a card that has no entry data carries `draft: null` and says
  // so. The prefill's `active` flag is then `mode === 'addCard' && !draft` —
  // correct by construction rather than by convention.
  return { requestDictLookup, requestAddCardFromEntry, requestAddCardFromSelection };
}
