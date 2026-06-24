-- =============================================================================
-- 014_example_sentences.sql
--
-- Add a curated bank of example sentences sourced from Kanjium's sentences.txt.
-- Each row is keyed by `word_form` (the headword the sentence exemplifies);
-- at query time the details endpoint matches that against word_kanji.kanji
-- and word_readings.kana across the word's forms.
--
-- `ja_ruby` holds the original HTML with <ruby> markup so the web frontend can
-- render furigana natively; mobile parses it client-side into segments.
--
-- Apply with:
--   psql "$DATABASE_URL" -f migrations/014_example_sentences.sql
-- Then run the parser:
--   node helpers/files/parse_example_sentences.js \
--        --file ./data/sentences.txt --db "$DATABASE_URL"
-- =============================================================================

CREATE TABLE IF NOT EXISTS example_sentences (
  id          SERIAL PRIMARY KEY,
  word_form   TEXT NOT NULL,
  ja_plain    TEXT NOT NULL,
  ja_ruby     TEXT,
  en          TEXT NOT NULL,
  grade_label TEXT
);

CREATE INDEX IF NOT EXISTS idx_example_sentences_form
  ON example_sentences (word_form);
