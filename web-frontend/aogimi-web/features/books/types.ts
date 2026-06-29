// Backend `book_progress` row + supporting types, plus the merged local
// `Book` tile shape.

// Shared book type. The merged shape combines local IndexedDB metadata with
// the backend's progress record so a single tile can render either side
// (or both, once reconciled).
export interface Book {
  /** Local IndexedDB id (filename), or backend UUID for unavailable books */
  id: string;
  title: string;
  author: string;
  filename: string;
  coverColor: string;
  hasCover: boolean;
  coverImage?: string;
  progress: number;
  /** Whether the EPUB file exists locally on this device */
  available: boolean;
  /** Backend book UUID (for device availability tracking) */
  backendId?: string;
  /** ISO timestamp of the most recent read session (from backend). Local-only books have null. */
  lastReadAt?: string | null;
}

export interface BookProgressRecord {
  id: string; // UUID
  user_id: number;
  filename: string;
  title: string;
  author: string;
  cover_color: string;
  cfi_position: string | null;
  spine_index: number;
  total_spine_items: number | null;
  progress: number;
  file_hash: string | null;
  /** EPUB spine-text SHA-256. Reserved for PDF text-content-hash in a
   *  future phase. Always null for PDFs in the current phase. */
  content_hash: string | null;
  /** PDF /ID[0] from the trailer — stable across modifications. Null for EPUBs. */
  pdf_id_original: string | null;
  /** PDF /ID[1] from the trailer — changes on each save. Null for EPUBs. */
  pdf_id_current: string | null;
  /** PDF page count. Mobile may report null until phase 3. EPUB-side null. */
  page_count: number | null;
  /** PDF: true when the document has an extractable text layer (vs scanned). */
  has_text_layer: boolean | null;
  /** PDF /Info /Producer. Diagnostic only — not used in matching. */
  producer: string | null;
  /** xmpMM:DocumentID — changes on export/save-as. Forensics only. */
  xmp_document_id: string | null;
  /** xmpMM:OriginalDocumentID — stable across re-saves of the same source.
   *  Strong cross-device match key (priority 2 in the matcher). */
  xmp_original_id: string | null;
  /** PDF: per-page SHA-256 of normalized text. Stored for the deferred
   *  page-overlap match layer; not yet matched on. EPUB-side null. */
  page_hashes: string[] | null;
  /** PDF: character count of the normalized full text (post header/footer
   *  strip). EPUB-side null. */
  text_length: number | null;
  /** PDF: first DOI found in front-matter. Match layer (very_high). */
  detected_doi: string | null;
  /** PDF: ISBN-10 or ISBN-13 (checksum-validated). Match layer (high),
   *  paired with page_count ±5% tolerance. */
  detected_isbn: string | null;
  /** PDF: per-sampled-page dHash (64-bit hex). Visual match layer (medium):
   *  fires when both sides have phashes, page_count agrees ±10%, and the
   *  average hamming distance is ≤ 8. Web only; mobile null. */
  page_phashes: string[] | null;
  /** Version of the fingerprinting algorithm that produced this row.
   *  Defaults to 1 on rows that existed before mig 020. */
  fingerprint_version: number;
  dc_identifier: string | null;
  language: string | null;
  publisher: string | null;
  started_at: string;
  last_read_at: string;
  created_at: string;
}

export interface ProgressPayload {
  cfiPosition?: string;
  progress?: number;
  spineIndex?: number;
  totalSpineItems?: number;
}

// ── Hash-based matching ─────────────────────────────────────────────────────

export interface MatchCandidate {
  file_hash: string;
  /** EPUB: spine-text SHA-256. PDF: SHA-256 of normalized extracted text
   *  (null when the PDF has no text layer). */
  content_hash: string | null;
  /** PDF /ID[0]. Null for EPUB candidates. */
  pdf_id_original: string | null;
  /** xmpMM:OriginalDocumentID. Null for EPUB candidates and PDFs without XMP. */
  xmp_original_id: string | null;
  /** PDF: scraped DOI. Null for EPUBs and PDFs without one. */
  detected_doi: string | null;
  /** PDF: validated ISBN-10/13. Null for EPUBs and PDFs without one.
   *  Matched only when both sides also have `page_count` (±5% tolerance). */
  detected_isbn: string | null;
  /** PDF: page count. Required for the ISBN match layer to fire. */
  page_count: number | null;
  /** PDF: per-sampled-page dHash array. Required for the visual match
   *  layer to fire (medium confidence). */
  page_phashes: string[] | null;
  metadata: {
    title: string;
    author: string;
    dc_identifier: string | null;
    filename: string;
  };
}

export type MatchType =
  | 'file_hash'
  | 'xmp_original_id'
  | 'pdf_trailer_id'
  | 'doi'
  | 'isbn'
  | 'content'
  | 'visual'
  | 'metadata'
  | 'filename';

export interface MatchResult {
  match: BookProgressRecord;
  match_type: MatchType;
}
