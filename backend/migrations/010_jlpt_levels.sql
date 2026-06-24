-- JLPT levels — additive schema for ranking + display.
-- Idempotent: every statement uses IF NOT EXISTS so re-running is safe.
-- Seeding (011_jlpt_seed.psql) and backfill (012_jlpt_backfill.sql) are
-- separate steps so the data load is decoupled from the schema change.
--
-- Convention: jlpt_level is the numeric tier (1 = N1 hardest, 5 = N5 easiest).
-- NULL means "not in any of the JLPT N1..N5 word lists we ingested".

BEGIN;

-- ── words ────────────────────────────────────────────────────────────────────
-- Per-entry JLPT classification, derived in 012_jlpt_backfill.sql by matching
-- (kanji form, reading) pairs from the CSVs against word_kanji × word_readings.
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS jlpt_level smallint
    CHECK (jlpt_level IS NULL OR jlpt_level BETWEEN 1 AND 5);

-- ── kanji ────────────────────────────────────────────────────────────────────
-- Per-character JLPT level, derived as MAX(jlpt_level) across all words that
-- contain the literal. "Easier classification wins" — if 食 appears in N5 and
-- N3 words, it ends up as N5.
ALTER TABLE kanji
  ADD COLUMN IF NOT EXISTS jlpt_level smallint
    CHECK (jlpt_level IS NULL OR jlpt_level BETWEEN 1 AND 5);

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Words ranking helper — ordering / filtering by JLPT in search.
CREATE INDEX IF NOT EXISTS idx_words_jlpt_level
  ON words (jlpt_level DESC NULLS LAST, priority_score DESC);

-- Lookup by single-character JLPT (used by the per-character display logic).
CREATE INDEX IF NOT EXISTS idx_kanji_jlpt_level
  ON kanji (jlpt_level DESC NULLS LAST);

-- ── Staging table for the CSV import ─────────────────────────────────────────
-- Persistent (not TEMP) so 011_jlpt_seed.psql and 012_jlpt_backfill.sql can
-- run as separate psql sessions. Dropped at the end of 012.
CREATE TABLE IF NOT EXISTS _jlpt_raw (
  level      smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  expression text NOT NULL,
  reading    text NOT NULL,
  meaning    text,
  tags       text
);

CREATE INDEX IF NOT EXISTS idx_jlpt_raw_reading ON _jlpt_raw (reading);

COMMIT;
