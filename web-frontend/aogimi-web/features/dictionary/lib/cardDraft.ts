import { MAX_MEANINGS_ON_CARD } from '@/features/study/decks';
import { preferredHeadword } from './headword';
import type { ExampleSentence, KanjiInfo, WordResult } from '../types';

/**
 * Turns a dictionary entry into the `{ front, back, context }` triple the
 * add-card flow takes.
 *
 * Lives here rather than in a component because three surfaces build the same
 * draft — the rail's row buttons, the detail pane's "Add to deck", and the
 * reader's bubble — and they were drifting apart as separate copies.
 *
 * `context` is a *fallback*: the reader passes the sentence the word was tapped
 * in, and only when it has none does the first example sentence stand in.
 */
export type CardDraft = {
  front: string;
  back: string;
  context?: string;
};

export function wordCardDraft(
  word: WordResult,
  query?: string,
  sentences?: ExampleSentence[],
): CardDraft {
  const parts: string[] = [];

  const reading = word.readings[0]?.form;
  if (reading) parts.push(reading);

  const glosses = word.meanings.filter((m) => m.lang === 'eng');
  if (glosses.length > 0) {
    parts.push(
      glosses
        .slice(0, MAX_MEANINGS_ON_CARD)
        .map((m, i) => `${i + 1}. ${m.meaning}`)
        .join('\n'),
    );
  }

  return {
    front: preferredHeadword(word, query),
    back: parts.join('\n'),
    context: sentences?.[0]?.ja,
  };
}

export function kanjiCardDraft(kanji: KanjiInfo): CardDraft {
  const parts: string[] = [];
  if (kanji.on_readings.length > 0) parts.push(kanji.on_readings.join('、'));
  if (kanji.kun_readings.length > 0) parts.push(kanji.kun_readings.join('、'));
  if (kanji.meanings.length > 0) parts.push(kanji.meanings.join(', '));

  return { front: kanji.literal, back: parts.join('\n') };
}
