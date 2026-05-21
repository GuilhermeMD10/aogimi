-- Migration 018: PDF text-derived fingerprint fields.
--
-- Adds the columns the phase-3 text-extraction pipeline writes. `content_hash`
-- itself already exists — it was reserved for this in mig 016. For PDFs
-- imported on web after this migration, `content_hash` carries the SHA-256
-- of normalized extracted text. Mobile (no native text extractor) keeps
-- writing null until/unless a future phase adds extraction there.
--
--   page_hashes     — array of per-page SHA-256 hashes (text[]) of normalized
--                     extracted text. Stored for the (deferred) page-overlap
--                     match layer; not yet matched on in phase 3.
--   text_length     — total character count of the normalized text (post
--                     header/footer strip). Useful sanity-check / UI surface.
--   detected_doi    — DOI scraped from the first ~3 pages of text. New
--                     match layer (priority 4, very_high confidence).
--   detected_isbn   — ISBN-10 or ISBN-13 (checksum-validated) scraped from
--                     first/last 3 pages. New match layer (priority 5, high),
--                     paired with page_count ±5% tolerance.
--
-- Run manually:
--   psql -d langeco -f migrations/018_pdf_text_fingerprints.sql

BEGIN;

ALTER TABLE book_progress
  ADD COLUMN IF NOT EXISTS page_hashes   text[],
  ADD COLUMN IF NOT EXISTS text_length   int,
  ADD COLUMN IF NOT EXISTS detected_doi  text,
  ADD COLUMN IF NOT EXISTS detected_isbn text;

-- New match layers — partial indexes on the keys actually used in the
-- matcher. page_hashes does NOT get an index: the deferred overlap-search
-- layer would scan per-user anyway, and GIN on a text[] column is overkill
-- for the scoped-search approach.
CREATE INDEX IF NOT EXISTS idx_book_progress_detected_doi
  ON book_progress (detected_doi) WHERE detected_doi IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_book_progress_detected_isbn
  ON book_progress (detected_isbn) WHERE detected_isbn IS NOT NULL;

COMMIT;
