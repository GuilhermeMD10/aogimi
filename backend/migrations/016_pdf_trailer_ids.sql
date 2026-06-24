-- Migration 016: PDF trailer /ID columns.
--
-- Splits PDF /ID storage out of `content_hash` so the column can be
-- repurposed in a later phase for SHA-256 of extracted text.
--
-- Before: PDFs stored /ID[0] in content_hash (semantic collision with
-- EPUB's spine-text-SHA value in the same column).
--
-- After: PDFs use pdf_id_original (= /ID[0]) and pdf_id_current (= /ID[1]).
-- content_hash for PDFs is nulled and reserved for the text-content-hash
-- use case in a later migration. EPUB content_hash is untouched.
--
-- Run manually:
--   psql -d langeco -f migrations/016_pdf_trailer_ids.sql

BEGIN;

-- ── New columns ─────────────────────────────────────────────────────────────

ALTER TABLE book_progress
  ADD COLUMN IF NOT EXISTS pdf_id_original text,
  ADD COLUMN IF NOT EXISTS pdf_id_current  text;

-- ── Backfill from legacy content_hash for PDF rows ──────────────────────────
--
-- The pre-migration scheme stored PDF /ID[0] in content_hash. Move it to
-- pdf_id_original (the new home) and null out content_hash for those
-- rows so the column can be repurposed without ambiguity.
--
-- Only touch rows that look like PDFs (filename suffix). EPUB rows keep
-- their content_hash (which is correctly the spine-text SHA).
--
-- The `pdf_id_original IS NULL` guard makes this idempotent — re-running
-- the migration won't clobber values inserted by post-migration writes.

UPDATE book_progress
SET pdf_id_original = content_hash,
    content_hash    = NULL
WHERE filename ILIKE '%.pdf'
  AND content_hash IS NOT NULL
  AND pdf_id_original IS NULL;

-- ── Indexes ─────────────────────────────────────────────────────────────────
--
-- Partial: most rows are EPUBs (pdf_id_original IS NULL), so a partial
-- index is much smaller than indexing every row.

CREATE INDEX IF NOT EXISTS idx_book_progress_pdf_id_original
  ON book_progress (pdf_id_original) WHERE pdf_id_original IS NOT NULL;

COMMIT;
