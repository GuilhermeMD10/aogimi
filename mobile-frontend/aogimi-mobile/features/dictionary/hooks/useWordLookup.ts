import { useCallback, useMemo, useState } from 'react';
import type { FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';
import { kanjiCardDraft, wordCardDraft } from '../lib/cardDraft';
import type { KanjiInfo, WordDetails } from '../types';

/**
 * "Look this word up" as one call, for a screen whose only dictionary is the
 * lookup sheet.
 *
 * Spread `drawers` onto `LookupDrawers` and call `open(term)` from a button.
 * The two sheets' state and the two draft builders are the whole of it — the
 * same wiring the dictionary tab and the reader each do inline, which is why
 * this exists rather than a third copy of it.
 *
 * **Not for the reader.** It raises the flashcard drawer from a bare selection
 * with no lookup in play, so its prefill state has to sit above both sheets and
 * outlive either one; it wires `LookupDrawers` directly.
 */
export function useWordLookup() {
  /** `null` closed, `''` open on the search stage, otherwise the queried term. */
  const [term, setTerm] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<FlashcardPrefill | null>(null);

  const open = useCallback((next: string) => setTerm(next), []);
  const close = useCallback(() => setTerm(null), []);

  const drawers = useMemo(
    () => ({
      dictTerm: term,
      onCloseDict: () => setTerm(null),
      // `term` as the query, not the entry's own headword: it is what the user
      // searched, and `preferredHeadword` picks the face to show from it.
      onAddFlashcard: (details: WordDetails) =>
        setPrefill(wordCardDraft(details.word, term ?? undefined, details.sentences)),
      onAddKanji: (kanji: KanjiInfo) => setPrefill(kanjiCardDraft(kanji)),
      flashcardPrefill: prefill,
      onCloseFlashcard: () => setPrefill(null),
    }),
    [term, prefill],
  );

  return { open, close, drawers };
}
