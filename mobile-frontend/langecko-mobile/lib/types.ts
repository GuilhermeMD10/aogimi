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

export type WordDetails = {
  word: WordResult;
  kanjis: KanjiInfo[];
};

// ── User ─────────────────────────────────────────────────────────────────────

export type UserPublic = {
  id: number;
  username: string;
};

export type UserProfile = {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  language: string;
  avatar_index: number;
  created_at: string;
};

export type UserProfileUpdate = Partial<{
  display_name: string | null;
  email: string | null;
  language: string;
  avatar_index: number;
}>;

// ── Books (book_progress) ────────────────────────────────────────────────────

export type BookRecord = {
  id: string;
  user_id: number;
  filename: string;
  title: string;
  author: string;
  cover_color: string;
  cfi_position: string | null;
  spine_index: number;
  total_spine_items: number | null;
  progress: number;
  started_at: string;
  last_read_at: string;
  created_at: string;
};

export type BookProgressUpdate = Partial<{
  cfiPosition: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
}>;

// ── Decks / cards ────────────────────────────────────────────────────────────

export type DeckRecord = {
  id: string;
  user_id: number;
  name: string;
  description: string;
  created_at: string;
};

export type CardState = 'new' | 'learning' | 'mastered';

export type CardRecord = {
  id: string;
  deck_id: string;
  front: string;
  reading: string;
  back: string;
  notes: string;
  state: CardState;
  reviewed_times: number;
  created_at: string;
};
