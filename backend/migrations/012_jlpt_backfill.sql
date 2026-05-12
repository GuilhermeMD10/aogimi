-- Backfill words.jlpt_level + kanji.jlpt_level from the staged CSV rows.
-- Idempotent: every UPDATE recomputes from _jlpt_raw, no row is appended to.
-- Drops the staging table at the end.
--
-- Matching rules
--   1. Each CSV row has `expression` (sometimes "form1; form2") + `reading`.
--      We split expression on `;`, so "足; 脚 / あし" tries both 足/あし and
--      脚/あし against JMdict.
--   2. A JMdict word matches when *some* word_kanji.kanji equals the form AND
--      *some* word_readings.kana equals the reading on the same word_id.
--   3. Kana-only CSV rows (form == reading) match JMdict entries with no
--      word_kanji rows at all — i.e. the JMdict word is itself kana-only.
--   4. When a word matches multiple CSV levels, the easier classification
--      wins (MAX numeric level → N5 trumps N1). Rationale: if a word is
--      common enough to appear in N5 study material, that should be the tier
--      surfaced for ranking, regardless of also appearing in advanced lists.
--   5. Kanji JLPT level = MAX(level) across all matched JMdict words that
--      contain the literal in any kanji form.
--
-- Run order: 010_jlpt_levels.sql → 011_jlpt_seed.psql → this file.

BEGIN;

-- ── 1. Expand the staging table — one row per (level, single form, reading) ──
-- Splitting expression on `;` happens here so the join below stays cheap.
CREATE TEMP TABLE _jlpt_expanded ON COMMIT DROP AS
SELECT level,
       trim(form) AS form,
       reading
  FROM _jlpt_raw,
       LATERAL unnest(string_to_array(expression, ';')) AS form
 WHERE trim(form) <> '';

CREATE INDEX ON _jlpt_expanded (form);
CREATE INDEX ON _jlpt_expanded (reading);

-- ── 2. Find JMdict word_ids for each (form, reading, level) combo ────────────
-- Two cases unioned: kanji+kana entries and kana-only entries.
CREATE TEMP TABLE _jlpt_word_match ON COMMIT DROP AS
SELECT DISTINCT w.id AS word_id, e.level
  FROM _jlpt_expanded e
  JOIN word_kanji    wk ON wk.kanji = e.form
  JOIN word_readings wr ON wr.word_id = wk.word_id AND wr.kana = e.reading
  JOIN words         w  ON w.id      = wk.word_id
UNION
SELECT DISTINCT w.id AS word_id, e.level
  FROM _jlpt_expanded e
  JOIN word_readings wr ON wr.kana = e.reading
  JOIN words         w  ON w.id   = wr.word_id
 WHERE e.form = e.reading
   AND NOT EXISTS (SELECT 1 FROM word_kanji wk2 WHERE wk2.word_id = w.id);

-- ── 3. Pick MAX level per word (easier classification wins) ──────────────────
-- Reset first so deletions in a re-run actually drop the level for words
-- that no longer appear in the staging data.
UPDATE words SET jlpt_level = NULL WHERE jlpt_level IS NOT NULL;

WITH best AS (
  SELECT word_id, MAX(level)::smallint AS level
    FROM _jlpt_word_match
   GROUP BY word_id
)
UPDATE words w
   SET jlpt_level = b.level
  FROM best b
 WHERE b.word_id = w.id;

-- ── 4. Derive per-kanji JLPT level from matched words ────────────────────────
-- For every CJK literal that appears in any matched word's kanji forms, take
-- the MAX(level) across those words. We extract single chars by joining kanji
-- to regexp_split_to_table, filtered to the Han script range.
UPDATE kanji SET jlpt_level = NULL WHERE jlpt_level IS NOT NULL;

WITH chars AS (
  SELECT DISTINCT
         regexp_split_to_table(wk.kanji, '') AS literal,
         w.jlpt_level                        AS level
    FROM words w
    JOIN word_kanji wk ON wk.word_id = w.id
   WHERE w.jlpt_level IS NOT NULL
),
filtered AS (
  -- Only keep CJK Unified Ideographs (主 etc.), drop punctuation / kana that
  -- might have ended up in a `kanji` column.
  SELECT literal, level
    FROM chars
   WHERE literal ~ '[一-鿿㐀-䶿]'
),
best AS (
  SELECT literal, MAX(level)::smallint AS level
    FROM filtered
   GROUP BY literal
)
UPDATE kanji k
   SET jlpt_level = b.level
  FROM best b
 WHERE b.literal = k.literal;

-- ── 5. Drop staging — final state has no _jlpt_raw / temp tables ─────────────
DROP TABLE IF EXISTS _jlpt_raw;

COMMIT;

-- Quick sanity checks — uncomment to inspect.
-- SELECT jlpt_level, COUNT(*) FROM words GROUP BY jlpt_level ORDER BY jlpt_level;
-- SELECT jlpt_level, COUNT(*) FROM kanji GROUP BY jlpt_level ORDER BY jlpt_level;
