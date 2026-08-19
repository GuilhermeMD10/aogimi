// ── Backend `book_progress` row ─────────────────────────────────────────────

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
//   - pageCount / hasTextLayer: PDF only. Null on mobile — no native PDF
//     parser, so the tail-only scan cannot resolve them.
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

// ── Bookmarks (per-book, persisted on backend) ──────────────────────────────

export type BookmarkRecord = {
  id: string;
  book_id: string;
  cfi: string;
  label: string;
  created_at: string;
};

// ── Local-first sync state ──────────────────────────────────────────────────
//
// See `docs/SYNC_ARCHITECTURE.md` for the conceptual model and state
// transitions.

/**
 * What the local device thinks about this book's relationship to the
 * backend record. Absent means "no local entry exists" — the book is
 * either cloud-only (backend has it, we don't) or doesn't exist at all
 * for this user.
 */
export type SyncState = 'synced' | 'pending';

/**
 * Snapshot of the metadata captured at offline-import time. Used to
 * retry POST /api/books later (via Sync-now) without re-probing the
 * file. Mobile only — web's IndexedDB BookRecord already carries the
 * full metadata in the same row.
 *
 * Fields mirror the `createBook` payload accepted by the backend (see
 * `backend/API_ROUTES.md` → POST /api/books). When adding a new backend
 * identity field, add it here too so a deferred sync doesn't drop it.
 */
export type PendingPayload = {
  title: string;
  author: string;
  fileHash: string | null;
  contentHash: string | null;
  pdfIdOriginal: string | null;
  pdfIdCurrent: string | null;
  pageCount: number | null;
  hasTextLayer: boolean | null;
  producer: string | null;
  xmpDocumentId: string | null;
  xmpOriginalId: string | null;
  pageHashes: string[] | null;
  textLength: number | null;
  detectedDoi: string | null;
  detectedIsbn: string | null;
  pagePhashes: string[] | null;
  fingerprintVersion: number;
  dcIdentifier: string | null;
  language: string | null;
  publisher: string | null;
  /**
   * ISO timestamp captured when the local entry was first marked
   * pending (i.e. the moment of import on this device). Used by the
   * library tile to render `started_at` / `created_at` / `last_read_at`
   * for pending books instead of "now-on-render" timestamps that lie
   * about how old the import is. Optional for back-compat with entries
   * written before this field existed — readers fall back to "now".
   */
  firstSeenAt?: string;
};

/**
 * The persisted shape of a single local book entry on mobile. Stored
 * in AsyncStorage under the `book_fingerprints_v1` key as a JSON map
 * keyed by filename.
 *
 * Backward-compat: legacy entries (pre-sync-state) only had `fileHash`.
 * Readers treat `syncState === undefined` as `'synced'` — those entries
 * came from imports that successfully pushed before the marker existed.
 *
 * Forward-compat: only `fileHash` is required. New optional fields can
 * be added without a key bump as long as readers handle their absence.
 */
export type LocalBookEntry = {
  fileHash: string;
  syncState?: SyncState;
  /**
   * Only meaningful when `syncState === 'pending'`. Carries the
   * metadata snapshot needed to retry the POST /api/books push.
   */
  pendingPayload?: PendingPayload;
};
