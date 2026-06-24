-- Migration 020: Fingerprint algorithm version.
--
-- Tags every book_progress row with the version of the fingerprinting
-- algorithm that produced its hashes / detected_* / page_phashes. When
-- the algorithm changes (normalization rules, dHash scheme, etc.) the
-- frontend bumps `FINGERPRINT_VERSION` and new imports get the new
-- value. Old rows keep their original version so direct matches stay
-- valid; the matcher can later require version equality on the layers
-- whose semantics actually changed.
--
-- v1 = the algorithm shipped through phases 0-4.
--
-- Default 1 backfills every existing row with v1 (correct — they were
-- all produced by what we now call v1). Future migrations don't need to
-- touch existing rows; only the frontend constant changes.
--
-- Run manually:
--   psql -d aogimi -f migrations/020_fingerprint_version.sql

BEGIN;

ALTER TABLE book_progress
  ADD COLUMN IF NOT EXISTS fingerprint_version int NOT NULL DEFAULT 1;

COMMIT;
