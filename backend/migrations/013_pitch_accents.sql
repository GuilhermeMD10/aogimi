-- =============================================================================
-- 013_pitch_accents.sql
--
-- Add a per-reading pitch-accent column. Sourced from Kanjium's accents.txt
-- (see helpers/files/parse_pitch_accents.js). Values are the raw position
-- numbers as a comma-separated string ("0", "1", "2,3"). Position 0 = heiban
-- (flat), 1 = atamadaka, etc. NULL means no data — Kanjium doesn't cover the
-- entire JMdict, so a notable fraction of readings will stay null.
--
-- Apply with:
--   psql "$DATABASE_URL" -f migrations/013_pitch_accents.sql
-- Then run the parser:
--   node helpers/files/parse_pitch_accents.js \
--        --file ./data/accents.txt --db "$DATABASE_URL"
-- =============================================================================

ALTER TABLE word_readings
  ADD COLUMN IF NOT EXISTS pitch_accents TEXT;

-- Partial index so word-detail queries can cheaply check "any pitch known?"
-- per word without scanning the whole readings table.
CREATE INDEX IF NOT EXISTS idx_word_readings_pitch_not_null
  ON word_readings (word_id)
  WHERE pitch_accents IS NOT NULL;
