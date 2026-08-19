// Flattening a `SearchResponse` into the rows the results list renders.
//
// **This is where the dropped results come back.** `searchLocal` answers four
// shapes: a single-kanji query returns `{ kanji, words, names }`, a kana query
// `{ words, names, kanjis }`, and word/meaning queries `{ words }`. The old
// list called a `collectWords()` that returned `res.words` and nothing else, so
// searching 辞 listed every word containing the character and never the
// character, and no name result had ever been rendered on mobile at all.
//
// Pure and view-free: order and grouping are decisions about the *data*, so
// they live here rather than inside the list.

import type { KanjiInfo, NameResult, SearchResponse, WordResult } from '../types';

export type ResultRow =
  | { key: string; kind: 'section'; group: ResultGroup; count: number }
  | { key: string; kind: 'word'; word: WordResult; index: number }
  | { key: string; kind: 'kanji'; kanji: KanjiInfo }
  | { key: string; kind: 'name'; name: NameResult };

export type ResultGroup = 'words' | 'kanji' | 'names';

type Groups = {
  words: WordResult[];
  kanjis: KanjiInfo[];
  names: NameResult[];
  /** Kanji first when the query *was* a kanji — the character is the exact
   *  answer and the words merely contain it. Everywhere else words lead. */
  kanjiFirst: boolean;
};

function groupsFor(res: SearchResponse): Groups {
  switch (res.type) {
    case 'kanji':
      return {
        words: res.words,
        kanjis: res.kanji !== null ? [res.kanji] : [],
        names: res.names,
        kanjiFirst: true,
      };
    case 'kana':
      return { words: res.words, kanjis: res.kanjis, names: res.names, kanjiFirst: false };
    default:
      return { words: res.words, kanjis: [], names: [], kanjiFirst: false };
  }
}

/** Everything the response holds, for the "N results for 「…」" line. */
export function totalResults(res: SearchResponse): number {
  const g = groupsFor(res);
  return g.words.length + g.kanjis.length + g.names.length;
}

/**
 * The list's rows, in display order.
 *
 * Section headers appear **only when more than one group is present**. A plain
 * word search is a single list and already sits under the "RESULTS" header;
 * labelling it "WORDS" as well would be a header above a header.
 */
export function resultRows(res: SearchResponse): ResultRow[] {
  const g = groupsFor(res);

  const groups: { group: ResultGroup; rows: ResultRow[] }[] = [];

  if (g.words.length > 0) {
    groups.push({
      group: 'words',
      rows: g.words.map((word, index) => ({
        key: `w${word.id}`,
        kind: 'word' as const,
        word,
        index,
      })),
    });
  }
  if (g.kanjis.length > 0) {
    groups.push({
      group: 'kanji',
      rows: g.kanjis.map((kanji) => ({
        key: `k${kanji.literal}`,
        kind: 'kanji' as const,
        kanji,
      })),
    });
  }
  if (g.names.length > 0) {
    groups.push({
      group: 'names',
      rows: g.names.map((name) => ({
        key: `n${name.id}`,
        kind: 'name' as const,
        name,
      })),
    });
  }

  if (g.kanjiFirst) {
    groups.sort((a, b) => Number(b.group === 'kanji') - Number(a.group === 'kanji'));
  }

  const labelled = groups.length > 1;
  return groups.flatMap(({ group, rows }) =>
    labelled
      ? [{ key: `s-${group}`, kind: 'section' as const, group, count: rows.length }, ...rows]
      : rows,
  );
}
