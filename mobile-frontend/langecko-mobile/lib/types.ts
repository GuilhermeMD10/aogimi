/**
 * Shared domain types.
 *
 * Dictionary response types mirror the backend contract defined in
 * `backend/src/services/searchService.js` and consumed by the web
 * frontend's DictionaryView.
 */

export type WordMeaning = {
  meaning: string;
  pos: string | null;
  lang: string;
};

export type WordResult = {
  id: number;
  is_common: boolean;
  grade: number | null;
  char_grades: { char: string; grade: number | null }[];
  kanji: string[];
  readings: string[];
  meanings: WordMeaning[];
};

export type KanjiInfo = {
  literal: string;
  grade: number | null;
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

/**
 * Response shape for `GET /api/words/:id/details` — the dedicated endpoint
 * powering the word detail screen. `kanjis` is one entry per unique CJK
 * character in the word's kanji forms.
 */
export type WordDetails = {
  word: WordResult;
  kanjis: KanjiInfo[];
};

// ── Cards ────────────────────────────────────────────────────────────────────

export type Card = {
  id: string;
  front: string;
  back: string;
};

export type Deck = {
  id: string;
  name: string;
  /** Optional free-text note shown on the deck row and detail screen.
   *  May be missing on decks persisted before this field existed. */
  description?: string;
  cards: Card[];
};
