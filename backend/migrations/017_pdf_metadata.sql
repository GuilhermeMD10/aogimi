-- Migration 017: PDF metadata fields.
--
-- Cheap fields the importer can extract without doing full text extraction:
--
--   page_count       — # of pages. Used by ISBN match layer (phase 3+) for
--                      a sanity check (±5% tolerance) and surfaced in UIs.
--                      Mobile may leave this null until phase 3 brings
--                      native PDF parsing.
--   has_text_layer   — true when the PDF has an extractable text layer
--                      (vs. a scanned image-only PDF). Drives whether the
--                      text-content-hash + per-page-hash match layers are
--                      meaningful for this document. Mobile may leave
--                      this null until phase 3.
--   producer         — /Producer from /Info. Stored for debugging match
--                      failures only; NOT used in matching itself.
--   xmp_document_id  — xmpMM:DocumentID from XMP metadata. Changes when
--                      the document is exported/saved-as. Stored for
--                      forensics; not used in matching.
--   xmp_original_id  — xmpMM:OriginalDocumentID from XMP metadata. Stable
--                      across re-saves and exports of the same source
--                      document — the strongest cross-device match key
--                      we have for derived PDFs. New match layer at
--                      priority 2 (between file_hash and pdf_id_original).
--
-- Run manually:
--   psql -d langeco -f migrations/017_pdf_metadata.sql

BEGIN;

ALTER TABLE book_progress
  ADD COLUMN IF NOT EXISTS page_count      int,
  ADD COLUMN IF NOT EXISTS has_text_layer  boolean,
  ADD COLUMN IF NOT EXISTS producer        text,
  ADD COLUMN IF NOT EXISTS xmp_document_id text,
  ADD COLUMN IF NOT EXISTS xmp_original_id text;

-- Only xmp_original_id is a match layer — the others are stored for
-- diagnostics / future use, so they don't get indexes yet.
CREATE INDEX IF NOT EXISTS idx_book_progress_xmp_original_id
  ON book_progress (xmp_original_id) WHERE xmp_original_id IS NOT NULL;

COMMIT;
