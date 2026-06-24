-- =============================================================================
-- 015_sentence_contained_forms.sql
--
-- Broaden sentence lookup so a sentence is reachable from every word it
-- *contains*, not just the single word Kanjium curated it for.
--
-- The Kanjium import already supplies a ruby-annotated version of each
-- sentence; every `<rb>X</rb>` token is a kanji-bearing word inside that
-- sentence. We persist the union of those tokens (plus the curated
-- `word_form`) as a `TEXT[]` column and index it with GIN for fast set-
-- membership / overlap queries.
--
-- Apply with:
--   psql "$DATABASE_URL" -f migrations/015_sentence_contained_forms.sql
-- Then re-run the parser to populate the column:
--   node helpers/files/parse_example_sentences.js \
--        --file ./data/sentences.txt --db "$DATABASE_URL"
-- =============================================================================

ALTER TABLE example_sentences
  ADD COLUMN IF NOT EXISTS contained_forms TEXT[];

CREATE INDEX IF NOT EXISTS idx_example_sentences_contained_forms
  ON example_sentences USING GIN (contained_forms);
