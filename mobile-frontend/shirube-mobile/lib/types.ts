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

// Hash + canonical identity fields used by /api/books/match and
// /api/books/{id}/identity. fileHash is sha256 of the raw EPUB bytes;
// contentHash is a stable hash of the EPUB content (independent of repack
// noise); dcIdentifier is the EPUB's <dc:identifier> from content.opf.
export type EpubIdentity = Partial<{
  fileHash: string;
  contentHash: string;
  dcIdentifier: string;
  language: string;
  publisher: string;
}>;

// Sent to /api/books/match — one candidate per local book lacking a
// backend record. The server tries fileHash first, then contentHash,
// then dcIdentifier+title, finally filename.
export type BookMatchCandidate = {
  file_hash: string | null;
  content_hash: string | null;
  metadata: {
    title: string;
    author?: string;
    dc_identifier?: string | null;
    filename: string;
  };
};

export type BookMatchResult = {
  match: BookRecord | null;
  match_type: 'file_hash' | 'content' | 'metadata' | 'filename' | 'none';
};

// ── Devices ─────────────────────────────────────────────────────────────────

export type DeviceRecord = {
  device_id: string;
  user_id: number;
  name: string;
  last_seen: string;
  created_at: string;
};

// A book as returned by GET /api/devices/{deviceId}/books — book metadata
// plus an `available` flag indicating whether *this* device has the file
// locally.
export type DeviceBookRecord = BookRecord & {
  available: boolean;
};

// ── Bookmarks (per-book, persisted on backend) ──────────────────────────────

export type BookmarkRecord = {
  id: string;
  book_id: string;
  cfi: string;
  label: string;
  created_at: string;
};

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
