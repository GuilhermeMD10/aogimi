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

export type SearchResponse =
  | { type: 'kanji';   kanji: KanjiInfo | null; words: WordResult[]; names: NameResult[] }
  | { type: 'word';    words: WordResult[] }
  | { type: 'kana';    words: WordResult[]; names: NameResult[]; kanjis: KanjiInfo[] }
  | { type: 'meaning'; words: WordResult[] };

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
