import { MAX_CARD_MEANINGS } from '@/features/sky/stage/lib/limits';
import type { CardDraft } from '@/features/sky/stage/types';
import { preferredHeadword } from './headword';
import type { ExampleSentence, KanjiInfo, WordResult } from '../types';

/**
 * Turns a dictionary entry into the `CardDraft` the add-card flow takes.
 *
 * Lives here rather than in a component because three surfaces build the same
 * draft — the dictionary screen's detail pane, the reader's dictionary drawer,
 * and the reader's plain-selection path — and they were drifting apart as
 * separate copies: the dictionary screen took 2 glosses, the reader took 3,
 * both joined them with `; ` into an unstructured blob, and neither captured
 * `jlpt_level` at all.
 *
 * The type itself lives in `features/sky/stage`: it describes a *card*, and its
 * consumer chain terminates at `createCardLocal`. These builders are the
 * producers, not the owners.
 *
 * Mirrors the web's `features/dictionary/lib/cardDraft.ts`. Cards made on
 * either client should be indistinguishable in the database.
 */

/** JMdict tags English glosses `eng`; some older rows in this app's cache used
 *  `en`. Both are accepted rather than normalised at the boundary, because the
 *  read surfaces already accept both and fixing it in one place only would make
 *  the two disagree. */
const isEnglish = (lang: string) => lang === 'eng' || lang === 'en';

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

  // `readings[0]`, not a reading matched to the chosen headword: the backend
  // emits `kanji` and `readings` as two independently-sorted lists and JMdict's
  // `re_restr` (which reading goes with which kanji form) is never exposed, so a
  // true pairing isn't derivable client-side. It is also exactly what the entry
  // pane displays as *the* reading, so the card matches what the user was
  // looking at.
  const reading = word.readings[0]?.form ?? '';

  return {
    front,
    // Blanked when the reading *is* the front — the kana-only-entry case.
    reading: reading === front ? '' : reading,
    meanings: word.meanings
      .filter((m) => isEnglish(m.lang))
      .slice(0, MAX_CARD_MEANINGS)
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
    // Capped like a word's glosses, rather than joining every KANJIDIC meaning.
    meanings: kanji.meanings.slice(0, MAX_CARD_MEANINGS),
    jlptLevel: kanji.jlpt_level,
  };
}

/**
 * A draft for a bare string with no dictionary entry behind it — the reader's
 * "Card" action on a selection the user never looked up.
 *
 * Everything but the front is empty *and that is the honest result*: there is
 * no entry, so there are no glosses and no JLPT tier to capture. The drawer
 * opens with the front filled and the user types the rest.
 */
export function plainCardDraft(front: string, contextSentence?: string): CardDraft {
  return { front, reading: '', meanings: [], jlptLevel: null, contextSentence };
}
