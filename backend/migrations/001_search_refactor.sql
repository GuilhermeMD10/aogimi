-- Search refactor — additive schema changes for ranked word search.
-- Idempotent: every statement uses IF NOT EXISTS so re-running is safe.
-- Run inside a transaction; none of this touches row data (see 002_backfill.sql
-- for the data migration that populates the new columns).

BEGIN;

-- ── words ────────────────────────────────────────────────────────────────────
-- Pre-computed priority score (0–100). Higher = more common / more relevant.
-- Replaces scattered `is_common` + `priority LIKE '%ichi1%'` checks that can't
-- be used for ORDER BY efficiently.
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS priority_score smallint NOT NULL DEFAULT 0;

-- ── word_meanings ────────────────────────────────────────────────────────────
-- Normalized lookup key for exact / prefix match on the *primary* gloss of a
-- sense. `meaning` stays as the full sense text for display.
ALTER TABLE word_meanings
  ADD COLUMN IF NOT EXISTS gloss_norm  text;

-- 1-based ordinal of the sense within its word (1 = primary sense).
ALTER TABLE word_meanings
  ADD COLUMN IF NOT EXISTS sense_order smallint;

-- Generated tsvector column for English FTS fallback.
-- Stored so lookups don't re-tokenize per query; cost is paid once at write.
ALTER TABLE word_meanings
  ADD COLUMN IF NOT EXISTS tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(meaning, ''))) STORED;

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Exact-match ranking (score 1000): B-tree on the normalized gloss, English only.
CREATE INDEX IF NOT EXISTS idx_wm_gloss_norm_eng
  ON word_meanings (gloss_norm)
  WHERE lang = 'eng';

-- Prefix-match ranking (score 300): text_pattern_ops supports `LIKE 'foo%'`
-- under the C collation, English only.
CREATE INDEX IF NOT EXISTS idx_wm_gloss_norm_eng_prefix
  ON word_meanings (gloss_norm text_pattern_ops)
  WHERE lang = 'eng';

-- FTS fallback (score 100).
CREATE INDEX IF NOT EXISTS idx_wm_tsv_eng_gin
  ON word_meanings USING GIN (tsv)
  WHERE lang = 'eng';

-- Join back to parent word after the scored candidate pick.
CREATE INDEX IF NOT EXISTS idx_wm_word_id
  ON word_meanings (word_id);

-- Ordering helper — covers the final `ORDER BY priority_score DESC, is_common DESC`.
CREATE INDEX IF NOT EXISTS idx_words_priority
  ON words (priority_score DESC, is_common DESC, id);

-- Japanese exact-form lookup (used by deinflector and direct kanji/kana queries).
CREATE INDEX IF NOT EXISTS idx_wk_kanji ON word_kanji    (kanji);
CREATE INDEX IF NOT EXISTS idx_wr_kana  ON word_readings (kana);

-- ── word_forms ───────────────────────────────────────────────────────────────
-- Deinflection fallback for irregulars the rule engine can't handle (する, 来る,
-- 行く euphonic past, 〜だ copula forms, etc.). Populated out-of-band; optional.
CREATE TABLE IF NOT EXISTS word_forms (
  form       text   NOT NULL,
  base_id    bigint NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  inflection text   NOT NULL,
  PRIMARY KEY (form, base_id, inflection)
);

CREATE INDEX IF NOT EXISTS idx_word_forms_form ON word_forms (form);

COMMIT;
