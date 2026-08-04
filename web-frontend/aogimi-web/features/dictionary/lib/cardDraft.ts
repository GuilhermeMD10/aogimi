import { MAX_MEANINGS_ON_CARD, type CardDraft } from '@/features/study/decks';
import { preferredHeadword } from './headword';
import type { ExampleSentence, KanjiInfo, WordResult } from '../types';

/**
 * Turns a dictionary entry into the `CardDraft` the add-card flow takes.
 *
 * Lives here rather than in a component because four surfaces build the same
 * draft — the rail's row buttons, the two detail panes' "Add to deck", and the
 * reader's bubble — and they were drifting apart as separate copies.
 *
 * The type itself lives in `features/study/decks`: it describes a *card*, and
 * its consumer chain terminates at `decksApi.createCard`. These builders are
 * the producers, not the owners.
 */

/**
 * A word entry's draft.
 *
 * `sentences` is a *fallback* context: the reader passes the sentence the word
 * was tapped in, and only when it has none does the first example sentence
 * stand in.
 */
export function wordCardDraft(
  word: WordResult,
  query?: string,
  sentences?: ExampleSentence[],
): CardDraft {
  const front = preferredHeadword(word, query);

  // `readings[0]`, not a reading matched to the chosen headword: `assembler.js`
  // emits `kanji` and `readings` as two independently-sorted lists and JMdict's
  // `re_restr` (which reading goes with which kanji form) is never exposed, so a
  // true pairing isn't derivable client-side. It's also exactly what
  // `EntryDetail` already displays as *the* reading, so the card matches the
  // entry the user was looking at.
  const reading = word.readings[0]?.form ?? '';

  return {
    front,
    // Blanked when the reading *is* the front — the kana-only-entry case, and
    // the same rule the rail row already applies.
    reading: reading === front ? '' : reading,
    meanings: word.meanings
      .filter((m) => m.lang === 'eng')
      .slice(0, MAX_MEANINGS_ON_CARD)
      .map((m) => m.meaning),
    jlptLevel: word.jlpt_level,
    contextSentence: sentences?.[0]?.ja,
  };
}

/** A single character's draft. No context sentence — a kanji has no source
 *  sentence, and the entry carries no examples of its own. */
export function kanjiCardDraft(kanji: KanjiInfo): CardDraft {
  return {
    front: kanji.literal,
    // On-readings first, then kun-readings, flattened into one string.
    // `cards.reading` is a single column, so the on/kun distinction is
    // intentionally not preserved — un-flattening it later would need a data
    // migration, not just a change here.
    reading: [...kanji.on_readings, ...kanji.kun_readings].join('、'),
    // Capped like a word's glosses. This is narrower than the old `back`, which
    // joined *every* KANJIDIC meaning while the rail row beside it already
    // showed three — the cap is the intended behaviour, matching both the rail
    // and word cards.
    meanings: kanji.meanings.slice(0, MAX_MEANINGS_ON_CARD),
    jlptLevel: kanji.jlpt_level,
  };
}

/**
 * Flattens a draft into the `cards.back` string.
 *
 * **The only thing in the app that knows this format.** `back` is a rendering of
 * `reading` + `meanings`, which is why `CardDraft` doesn't carry it — it's
 * derived here at the API boundary instead, so the two can't drift. Retiring the
 * column later is a change to this helper's call sites and nothing else.
 *
 * The format reproduces what the builders used to emit directly — reading on its
 * own line when non-empty, then `1.`/`2.`/`3.` numbered glosses — so cards added
 * before and after the split read identically.
 */
export function cardBack(draft: CardDraft): string {
  const parts: string[] = [];

  if (draft.reading) parts.push(draft.reading);

  if (draft.meanings.length > 0) {
    parts.push(draft.meanings.map((m, i) => `${i + 1}. ${m}`).join('\n'));
  }

  return parts.join('\n');
}
