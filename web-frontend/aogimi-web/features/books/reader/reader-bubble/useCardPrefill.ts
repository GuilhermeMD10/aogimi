'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  kanjiCardDraft,
  railContents,
  searchDictionary,
  useDictionaryState,
  wordCardDraft,
} from '@/features/dictionary';
import type { RailContents } from '@/features/dictionary';

/**
 * The back side for a card that arrived without one.
 *
 * **The ordering is the whole problem.** A card started from the reader is
 * started from a *selection* — the surface string on the page, `食べました` — and
 * at that moment the app knows nothing about it. `requestAddCard` is called from
 * a context-menu click that has to open something immediately, so it can't wait
 * for a lookup: the alternative was a dead 300ms between the click and the
 * bubble. So the request carries an empty back, and this fills it in during the
 * time the user is already spending on the deck list. `BubbleContent` reads it
 * at the select-deck → create-card transition, which means the form is seeded
 * once, from a value that is final by the time it mounts — no prop that changes
 * under a half-typed textarea.
 *
 * Two sources, cheapest first:
 *
 *  1. **The lookup that already happened.** When the bubble owns the dictionary
 *     state it runs `runSearch(word)` on mount to build its own dictionary, so
 *     the answer is usually in the shared provider for free.
 *
 *  2. **Its own request.** When a dictionary surface is already on screen behind
 *     the bubble it must not touch the shared state — that's what
 *     `dictVisibleBehind` protects — and the query there is whatever *that*
 *     surface was showing, not this word. So the prefill fetches privately. One
 *     request, guarded on the first source having come up empty, and it writes
 *     nowhere anyone else can see.
 *
 * Only the back. The front stays exactly the string the reader selected: a card
 * fronted `食べる` when `食べました` was highlighted is a better flashcard and a
 * worse surprise, and the front is not editable in the form.
 */
export function useCardPrefill(word: string, active: boolean): string {
  const { query, result } = useDictionaryState();

  const shared = useMemo(
    () => (active && word && query === word ? backFor(railContents(result), word) : ''),
    [active, word, query, result],
  );

  const [own, setOwn] = useState('');

  useEffect(() => {
    if (!active || !word || shared) return;

    const controller = new AbortController();
    searchDictionary(word, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setOwn(backFor(railContents(res), word));
      })
      .catch(() => {
        // A prefill is a convenience. If it fails the field is simply empty,
        // which is exactly where this flow started.
      });

    return () => controller.abort();
  }, [active, word, shared]);

  return shared || own;
}

/** The top hit's card back — a word if there is one, otherwise a kanji entry. */
function backFor(contents: RailContents, word: string): string {
  const top = contents.words[0];
  if (top) return wordCardDraft(top, word).back;

  const kanji = contents.kanjiEntries[0];
  return kanji ? kanjiCardDraft(kanji).back : '';
}
