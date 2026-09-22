'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  kanjiCardDraft,
  railContents,
  searchDictionary,
  surfaceEntry,
  useDictionaryState,
  wordCardDraft,
} from '@/features/dictionary';
import type { RailContents } from '@/features/dictionary';
import type { CardDraft } from '@/features/sky/stage';

/**
 * The card fields for a card that arrived without any.
 *
 * **The ordering is the whole problem.** A card started from the reader is
 * started from a *selection* — the surface string on the page, `食べました` — and
 * at that moment the app knows nothing about it.
 * `requestAddCardFromSelection` is called from a context-menu click that has to
 * open something immediately, so it can't wait for a lookup: the alternative was
 * a dead 300ms between the click and the modal. So the request carries a `null`
 * draft, and this fills one in while the form is already on screen.
 * `AddCardForm` treats the result as the form's *seed* — a field shows the seed
 * until the user types into it, and what they typed after — so a value landing
 * late never overwrites a half-typed field.
 *
 * Two sources, cheapest first:
 *
 *  1. **The lookup that already happened.** A card started from the modal's own
 *     dictionary (page 10's `+`) arrives with a draft and never gets here; one
 *     started from a docked column that already looked the word up finds the
 *     answer in the shared provider for free.
 *
 *  2. **Its own request.** Otherwise the shared query is whatever the surface
 *     behind the modal was showing, not this word, and the modal must not touch
 *     shared state (`dictVisibleBehind`). So the prefill fetches privately. One
 *     request, guarded on the first source having come up empty, and it writes
 *     nowhere anyone else can see.
 *
 * **`null` on failure, never a blank draft.** The own-fetch guard below
 * truthy-tests the shared result, so a `{ reading: '', meanings: [] }` return
 * would read as "the shared source answered" and silently disable the private
 * fetch forever — a live bug with no type error to point at it, because a blank
 * `CardDraft` is a perfectly well-typed `CardDraft`. `draftFor` returns `null`
 * when there is no entry, `shared` starts as `null`, `own` starts as `null`, and
 * the guard is an explicit `!== null`. Keep all four.
 *
 * **The whole draft, but its front is discarded.** The consumer must keep
 * using the reader's own `word` as the card front, not this draft's
 * `front`. Merging the draft in wholesale changes every reader-started card's
 * front from the highlighted `食べました` to the dictionary headword `食べる` — a
 * worse flashcard and a much worse surprise, and the front isn't editable in
 * the form. The draft's `front` exists only because `wordCardDraft` builds a
 * complete draft; nothing here or downstream should read it.
 */
export function useCardPrefill(word: string, active: boolean): CardDraft | null {
  const { query, result } = useDictionaryState();

  const shared = useMemo(
    () => (active && word && query === word ? draftFor(railContents(result), word) : null),
    [active, word, query, result],
  );

  const [own, setOwn] = useState<CardDraft | null>(null);

  useEffect(() => {
    if (!active || !word || shared !== null) return;

    const controller = new AbortController();
    searchDictionary(word, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setOwn(draftFor(railContents(res), word));
      })
      .catch(() => {
        // A prefill is a convenience. If it fails the fields are simply empty,
        // which is exactly where this flow started.
      });

    return () => controller.abort();
  }, [active, word, shared]);

  return shared ?? own;
}

/**
 * The draft for the entry that actually carries the selected string.
 *
 * `surfaceEntry` does the choosing, and the choice matters: taking
 * `contents.words[0]` instead would mean highlighting 背 produces a card
 * fronted 背 whose fields come from 背広 — the top *ranked* hit, not the entry
 * the front names.
 */
function draftFor(contents: RailContents, word: string): CardDraft | null {
  const entry = surfaceEntry(contents, word);
  if (!entry) return null;

  return entry.kind === 'kanji' ? kanjiCardDraft(entry.kanji) : wordCardDraft(entry.word, word);
}
