// JMdict / KANJIDIC2 entries returned by the dictionary API.

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

export interface WordResult {
  id: number;
  is_common: boolean;
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest); null when not in JLPT lists. */
  jlpt_level: number | null;
  grade: number | null;
  char_grades: { char: string; grade: number | null }[];
  kanji: string[];
  readings: WordReading[];
  meanings: WordMeaning[];
}

export interface KanjiInfo {
  literal: string;
  grade: number | null;
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest); null when not in JLPT lists. */
  jlpt_level: number | null;
  stroke_count: number | null;
  radical: number | null;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
}

export interface NameResult {
  id: number;
  kanji: string | null;
  kana: string;
  name_type: string[];
  translations: string[];
}

export type SearchResponse =
  | { type: 'kanji'; kanji: KanjiInfo | null; words: WordResult[]; names: NameResult[] }
  | { type: 'word'; words: WordResult[] }
  | { type: 'kana'; words: WordResult[]; names: NameResult[]; kanjis: KanjiInfo[] }
  | { type: 'meaning'; words: WordResult[] };

export interface ExampleSentence {
  id: number;
  wordForm: string;
  /** Plain Japanese sentence — no markup. */
  ja: string;
  /** Same sentence with `<ruby>` furigana HTML. Safe to dangerouslySetInnerHTML;
   *  source is our own curated DB import. May be null when the import didn't
   *  carry the ruby field. */
  jaRuby: string | null;
  en: string;
  /** Difficulty hint, e.g. "6 (6th grade of primary school)". May be null. */
  gradeLabel: string | null;
}

export interface DetailsResponse {
  word: WordResult;
  kanjis: KanjiInfo[];
  sentences: ExampleSentence[];
}
