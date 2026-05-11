// JMdict / KANJIDIC2 entries returned by the dictionary API.

export type WordMeaning = {
  meaning: string;
  pos: string | null;
  lang: string;
};

export interface WordResult {
  id: number;
  is_common: boolean;
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest); null when not in JLPT lists. */
  jlpt_level: number | null;
  grade: number | null;
  char_grades: { char: string; grade: number | null }[];
  kanji: string[];
  readings: string[];
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

export interface DetailsResponse {
  word: WordResult;
  kanjis: KanjiInfo[];
}
