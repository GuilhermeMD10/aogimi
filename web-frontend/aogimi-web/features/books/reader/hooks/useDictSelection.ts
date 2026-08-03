'use client';

import { useCallback, useState } from 'react';
import { useDictionaryState } from '@/features/dictionary';
import type {
  KanjiInfo,
  RailContents,
  SearchResponse,
  Selection,
  WordResult,
} from '@/features/dictionary';

/**
 * Which row of a reader lookup surface's results is open.
 *
 * Both reader surfaces show the entry *instead of* their list, so "nothing
 * selected" is a real state they have to be able to return to — unlike
 * `/dictionary`, where the rail stays on screen and the first row is always
 * open. That's why this doesn't use `resolveSelection`: falling back to the
 * first row would mean the list could never be shown.
 *
 * **The word half stays in `DictionaryStateProvider`, on purpose.** That's what
 * makes `runSearch` clearing `selectedWordId` return the surface to its list
 * when a kanji chip re-runs the search, and it's the field the reader→surface
 * wiring already agrees on.
 *
 * The kanji half is local because the provider's field is a word id and a
 * character has none. It's stored *with the result it was picked from*, which is
 * what keeps the two halves in step without an effect: `runSearch` nulls
 * `selectedWordId` itself and hands back a brand-new result object, so a literal
 * from the previous query stops matching the moment the next one lands.
 * Validating against the current results alone wasn't enough — searching しょく
 * after opening 食 would find 食 among the kana query's kanji hits and silently
 * reopen it instead of showing the list.
 */
export function useDictSelection(contents: RailContents): {
  selection: Selection | null;
  selectedWord: WordResult | undefined;
  selectedKanji: KanjiInfo | undefined;
  select: (next: Selection) => void;
  /** Back to the list. */
  clear: () => void;
} {
  const { result, selectedWordId, setSelectedWordId } = useDictionaryState();

  // `from` is the result object the literal was picked out of — the validity
  // token described above, compared by reference.
  const [picked, setPicked] = useState<{ literal: string; from: SearchResponse | null } | null>(
    null,
  );
  const kanjiLiteral = picked && picked.from === result ? picked.literal : null;

  const selectedWord =
    selectedWordId == null ? undefined : contents.words.find((w) => w.id === selectedWordId);
  const selectedKanji =
    selectedWord || kanjiLiteral == null
      ? undefined
      : contents.kanjiEntries.find((k) => k.literal === kanjiLiteral);

  const selection: Selection | null = selectedWord
    ? { kind: 'word', id: selectedWord.id }
    : selectedKanji
      ? { kind: 'kanji', literal: selectedKanji.literal }
      : null;

  // The two halves are mutually exclusive in *state*, not just in the derivation
  // above, so there is never a hidden second selection waiting to resurface.
  const select = useCallback(
    (next: Selection) => {
      if (next.kind === 'word') {
        setPicked(null);
        setSelectedWordId(next.id);
      } else {
        setSelectedWordId(null);
        setPicked({ literal: next.literal, from: result });
      }
    },
    [setSelectedWordId, result],
  );

  const clear = useCallback(() => {
    setSelectedWordId(null);
    setPicked(null);
  }, [setSelectedWordId]);

  return { selection, selectedWord, selectedKanji, select, clear };
}
