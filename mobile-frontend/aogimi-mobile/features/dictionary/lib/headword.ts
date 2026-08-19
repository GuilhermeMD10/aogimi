import type { WordReading } from '../types';

/**
 * Whether a meaning's `lang` is English.
 *
 * JMdict tags English as `eng`, but some rows in our import carry the 2-letter
 * `en` — so both spellings have to pass or a chunk of entries render with no
 * gloss at all. Lives here, next to `preferredHeadword`, because it is the same
 * kind of thing: a pure "which part of this entry do we show" rule, shared by
 * the result row, the card-draft builder and the recent-lookups store.
 */
export function isEnglish(lang: string): boolean {
  return lang === 'eng' || lang === 'en';
}

/**
 * The form to show as an entry's title.
 *
 * If the user's query matches one of the entry's kanji or reading forms
 * exactly, surface *that* form rather than the dictionary's "primary" common
 * kanji — looking up ひらく and being shown 開く is disorienting when the entry
 * also lists the kana form you typed.
 *
 * Takes a structural subset rather than `WordResult` so the result row, the
 * detail pane and the card-draft builders can all call it with whatever shape
 * they happen to hold.
 *
 * **Moved here from the old result row component** when `cardDraft.ts` needed
 * it: a `lib/` module must not import from `components/`, and this was always a
 * pure helper that happened to live next to its first caller.
 */
export function preferredHeadword(
  word: { kanji: string[]; readings: Pick<WordReading, 'form'>[] },
  query: string | undefined,
): string {
  const q = (query ?? '').trim();
  if (q && word.kanji.includes(q)) return q;
  if (q && word.readings.some((r) => r.form === q)) return q;
  return word.kanji[0] ?? word.readings[0]?.form ?? '—';
}
