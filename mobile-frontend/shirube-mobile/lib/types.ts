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
  // Identity / fingerprint fields — same shape as web's BookProgressRecord.
  // The matcher + reconcile flow needs the file_hash specifically.
  file_hash: string | null;
  content_hash: string | null;
  pdf_id_original: string | null;
  pdf_id_current: string | null;
  page_count: number | null;
  has_text_layer: boolean | null;
  producer: string | null;
  xmp_document_id: string | null;
  xmp_original_id: string | null;
  page_hashes: string[] | null;
  text_length: number | null;
  detected_doi: string | null;
  detected_isbn: string | null;
  page_phashes: string[] | null;
  fingerprint_version: number;
  dc_identifier: string | null;
  language: string | null;
  publisher: string | null;
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
// /api/books/{id}/identity.
//   - fileHash: SHA-256 of the raw file bytes (both formats).
//   - contentHash: EPUB only — SHA-256 of concatenated spine text.
//   - pdfIdOriginal / pdfIdCurrent: PDF only — trailer /ID[0] and /ID[1].
//   - pageCount / hasTextLayer: PDF only. Mobile may leave null until
//     phase 3 brings native PDF parsing.
//   - producer: PDF only — diagnostic, not used in matching.
//   - xmpDocumentId / xmpOriginalId: PDF only — XMP metadata IDs.
//     xmpOriginalId is the strong cross-device match key for derived PDFs.
//   - pageHashes / textLength / detectedDoi / detectedIsbn: PDF text-derived
//     fields. Mobile leaves these null until/unless a future phase adds
//     native PDF text extraction.
//   - dcIdentifier / language / publisher: EPUB only — from content.opf.
export type BookIdentityPayload = Partial<{
  fileHash: string;
  contentHash: string;
  pdfIdOriginal: string;
  pdfIdCurrent: string;
  pageCount: number;
  hasTextLayer: boolean;
  producer: string;
  xmpDocumentId: string;
  xmpOriginalId: string;
  pageHashes: string[];
  textLength: number;
  detectedDoi: string;
  detectedIsbn: string;
  pagePhashes: string[];
  fingerprintVersion: number;
  dcIdentifier: string;
  language: string;
  publisher: string;
}>;

// Sent to /api/books/match — one candidate per local book lacking a
// backend record. The server tries fileHash → xmp_original_id →
// pdf_id_original → doi → isbn+page_count → content_hash →
// dcIdentifier → title+author → filename.
export type BookMatchCandidate = {
  file_hash: string | null;
  /** EPUB spine-text SHA-256. PDF text-content SHA-256 (web only — mobile
   *  leaves null since it has no text extractor). */
  content_hash: string | null;
  /** PDF /ID[0]. Null for EPUB candidates. */
  pdf_id_original: string | null;
  /** xmpMM:OriginalDocumentID. Null for EPUBs and PDFs without XMP. */
  xmp_original_id: string | null;
  /** PDF: DOI scraped from front-matter (web only — mobile null). */
  detected_doi: string | null;
  /** PDF: validated ISBN (web only — mobile null). */
  detected_isbn: string | null;
  /** PDF: page count. Mobile null until phase-3 deferred native parsing. */
  page_count: number | null;
  /** PDF: per-sampled-page dHash array. Visual match layer input.
   *  Mobile null (no render-to-grayscale pipeline). */
  page_phashes: string[] | null;
  metadata: {
    title: string;
    author?: string;
    dc_identifier?: string | null;
    filename: string;
  };
};

export type BookMatchResult = {
  match: BookRecord | null;
  match_type:
    | 'file_hash'
    | 'xmp_original_id'
    | 'pdf_trailer_id'
    | 'doi'
    | 'isbn'
    | 'content'
    | 'visual'
    | 'metadata'
    | 'filename'
    | 'none';
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
