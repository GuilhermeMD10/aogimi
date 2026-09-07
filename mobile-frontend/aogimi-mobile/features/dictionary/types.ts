export type WordMeaning = {
  meaning: string;
  pos: string | null;
  lang: string;
};

export type WordReading = {
  form: string;
  /** Raw Kanjium pitch positions, comma-separated for multi-pattern words
   * (e.g. "0", "1", "2,3"). Null when no data — Kanjium doesn't span all of
   * JMdict, so a notable fraction of readings have no pitch annotation. */
  pitchAccents: string | null;
};

export type WordResult = {
  id: number;
  is_common: boolean;
  grade: number | null;
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest); null = not in JLPT lists. */
  jlpt_level: number | null;
  char_grades: { char: string; grade: number | null }[];
  kanji: string[];
  readings: WordReading[];
  meanings: WordMeaning[];
};

export type KanjiInfo = {
  literal: string;
  grade: number | null;
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest); null = not in JLPT lists. */
  jlpt_level: number | null;
  stroke_count: number | null;
  radical: number | null;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
};

export type NameResult = {
  id: number;
  kanji: string | null;
  kana: string;
  name_type: string[];
  translations: string[];
};

/**
 * One **page** of results.
 *
 * `hasMore` is an intersection over the union rather than a field on each
 * shape, so every response carries it and a shape added later cannot forget
 * it. `res.type` still narrows — an intersection distributes over a union.
 *
 * It exists because the dictionary used to answer with a hard cap of 20 and no
 * way to tell "there are exactly 20 matches" from "here are the first 20 of
 * 400". `searchLocal` now pages, and `hasMore` is a *fact*, not a guess: each
 * capped query asks the database for one row more than it returns, and the
 * overflow row is the answer. See `PAGE_SIZE` in `lib/localDict.ts`.
 *
 * Mobile-only. The backend's `GET /api/search` has no equivalent field and
 * mobile never calls it — the dictionary here is the bundled SQLite, see
 * `lib/dictApi.ts`.
 */
export type SearchResponse = { hasMore: boolean } & (
  | { type: 'kanji';   kanji: KanjiInfo | null; words: WordResult[]; names: NameResult[] }
  | { type: 'word';    words: WordResult[] }
  | { type: 'kana';    words: WordResult[]; names: NameResult[]; kanjis: KanjiInfo[] }
  | { type: 'meaning'; words: WordResult[] }
);

export type ExampleSentence = {
  id: number;
  wordForm: string;
  ja: string;
  /** HTML with <ruby> markup; null when import had no ruby version. Mobile
   *  parses this client-side into segments for native rendering. */
  jaRuby: string | null;
  en: string;
  gradeLabel: string | null;
};

export type WordDetails = {
  word: WordResult;
  kanjis: KanjiInfo[];
  sentences: ExampleSentence[];
};
