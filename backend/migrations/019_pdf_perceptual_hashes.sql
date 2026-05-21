-- Migration 019: PDF perceptual hash array.
--
-- Per-page dHash (difference hash) computed from a deterministic sample
-- of pages — 64-bit hashes, hex-encoded. Backs a new "visual" match
-- layer (priority 8, medium confidence) that fires when:
--
--   * candidate and stored book both have page_phashes
--   * candidate and stored book page_counts agree within ±10%
--   * average hamming distance across paired phashes ≤ 8
--
-- Web populates this on import. Mobile leaves null (same as the phase-3
-- text-derived fields) — no native render-to-grayscale pipeline yet.
--
-- No index — the matcher scopes per user, scans in JS, and uses page_count
-- as a cheap pre-filter. A GIN/LSH bucket index would only be worth it if
-- a single user's library grew past a few hundred PDFs.
--
-- Run manually:
--   psql -d langeco -f migrations/019_pdf_perceptual_hashes.sql

BEGIN;

ALTER TABLE book_progress
  ADD COLUMN IF NOT EXISTS page_phashes text[];

COMMIT;
