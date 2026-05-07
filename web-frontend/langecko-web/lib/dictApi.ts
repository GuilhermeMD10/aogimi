import { apiGet } from './api';

export type WordMeaning = { meaning: string; pos: string | null; lang: string };

export interface WordResult {
  id: number;
  is_common: boolean;
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

/** Mean grade of the kanji in a word (lower = simpler → ranks higher).
 *  Words without per-character grades fall back to 0 (kana-only / trivial),
 *  pushing them to the top. Used for ordering only — never displayed. */
export function meanWordGrade(word: WordResult): number {
  const grades = (word.char_grades ?? [])
    .map((c) => c.grade)
    .filter((g): g is number => g != null);
  if (grades.length > 0) return grades.reduce((a, b) => a + b, 0) / grades.length;
  return 0;
}

export function searchDictionary(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  return apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, signal);
}

export function getWordDetails(
  id: number | string,
  signal?: AbortSignal,
): Promise<DetailsResponse> {
  return apiGet<DetailsResponse>(`/api/words/${encodeURIComponent(String(id))}/details`, signal);
}
