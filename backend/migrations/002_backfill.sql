-- Backfill for the search refactor. Safe to re-run: all updates are guarded
-- by NULL checks so already-populated rows are untouched.
--
-- IMPORTANT: back up the DB before running. This is a data migration, not a
-- schema migration, and it touches every row in `words` and `word_meanings`.

BEGIN;

-- ── 1. priority_score ────────────────────────────────────────────────────────
-- Derive a 0–100 score from the JMdict priority markers already on
-- word_kanji.priority and word_readings.priority. The markers (ichi1, news1,
-- spec1, gai1, nf01..nf24) indicate frequency tier.
--
--   ichi1 = Ichimango goi bunruishuu (common word list)
--   news1 = top ~12k words in Mainichi newspaper corpus
--   spec1 = special / high-frequency
--   gai1  = common loanword
--   nfXX  = frequency rank bucket (nf01 = top 500, nf02 = 501–1000, ...)
--
-- We take the max of kanji + reading markers per word so a word with
-- "ichi1" on any of its forms gets the bonus.

WITH markers AS (
  SELECT w.id AS word_id,
         -- Collapse priorities from both child tables into a single text blob
         -- so the boolean checks below see everything.
         string_agg(coalesce(wk.priority, ''), ',')
           || ',' || coalesce(string_agg(coalesce(wr.priority, ''), ','), '') AS prio
  FROM words w
  LEFT JOIN word_kanji    wk ON wk.word_id = w.id
  LEFT JOIN word_readings wr ON wr.word_id = w.id
  GROUP BY w.id
)
UPDATE words w
SET priority_score = LEAST(100,
    CASE WHEN m.prio LIKE '%ichi1%' THEN 40 ELSE 0 END
  + CASE WHEN m.prio LIKE '%news1%' THEN 30 ELSE 0 END
  + CASE WHEN m.prio LIKE '%spec1%' THEN 20 ELSE 0 END
  + CASE WHEN m.prio LIKE '%gai1%'  THEN 10 ELSE 0 END
  -- nf01..nf05 → +20, nf06..nf12 → +10, nf13..nf24 → +5
  + CASE
      WHEN m.prio ~ 'nf0[1-5]([^0-9]|$)' THEN 20
      WHEN m.prio ~ 'nf(0[6-9]|1[0-2])([^0-9]|$)' THEN 10
      WHEN m.prio ~ 'nf(1[3-9]|2[0-4])([^0-9]|$)' THEN 5
      ELSE 0
    END
  + CASE WHEN w.is_common THEN 10 ELSE 0 END
)::smallint
FROM markers m
WHERE m.word_id = w.id
  AND w.priority_score = 0;                       -- idempotent guard

-- ── 2. gloss_norm & sense_order on word_meanings ─────────────────────────────
-- gloss_norm: lowercased, punctuation-stripped copy of the *first* gloss of a
-- sense. For JMdict, sense entries are often joined with "; " (e.g.
-- "dog; hound; canine"); the primary gloss (what the dictionary considers the
-- canonical English word for the sense) is the one before the first "; ".
-- Taking the primary gloss as the exact-match key surfaces the canonical
-- word first — e.g. searching "dog" scores 犬 (primary="dog") above 子犬
-- (primary="puppy", "dog" appears in a secondary sense and gets FTS hit only).
--
-- Secondary glosses remain searchable via the FTS `tsv` column.

UPDATE word_meanings wm
SET gloss_norm = lower(
      regexp_replace(
        trim(split_part(wm.meaning, ';', 1)),       -- first gloss only
        '[[:punct:]]', '', 'g'                      -- strip punctuation
      )
    )
WHERE wm.gloss_norm IS NULL
  AND wm.meaning IS NOT NULL;

-- sense_order: 1-based ordinal by insertion order per (word_id, lang).
-- Uses ctid as the tiebreaker since the original tables don't have an
-- explicit sense ordinal column.
WITH numbered AS (
  SELECT ctid,
         row_number() OVER (PARTITION BY word_id, lang ORDER BY ctid) AS ord
  FROM word_meanings
  WHERE sense_order IS NULL
)
UPDATE word_meanings wm
SET sense_order = n.ord::smallint
FROM numbered n
WHERE wm.ctid = n.ctid;

COMMIT;

-- ── Optional: full gloss explosion (DESTRUCTIVE — DO NOT RUN BLINDLY) ────────
-- If you want every individual gloss to be exact-matchable (so "hound" finds
-- 犬 via its secondary gloss, not just FTS), uncomment and run as a separate
-- migration. Back up first.
--
-- BEGIN;
-- CREATE TEMP TABLE wm_exploded AS
--   SELECT word_id, lang, pos,
--          trim(g)                                                          AS meaning,
--          lower(regexp_replace(trim(g), '[[:punct:]]', '', 'g'))           AS gloss_norm,
--          (row_number() OVER (PARTITION BY word_id, lang
--                              ORDER BY src_ord, g_ord))::smallint          AS sense_order
--   FROM (
--     SELECT word_id, lang, pos,
--            row_number() OVER (PARTITION BY word_id, lang ORDER BY ctid) AS src_ord,
--            u.g_ord, u.g
--     FROM word_meanings,
--          LATERAL unnest(string_to_array(meaning, '; ')) WITH ORDINALITY AS u(g, g_ord)
--   ) t
--   WHERE trim(g) <> '';
-- TRUNCATE word_meanings;
-- INSERT INTO word_meanings (word_id, meaning, pos, lang, gloss_norm, sense_order)
-- SELECT word_id, meaning, pos, lang, gloss_norm, sense_order FROM wm_exploded;
-- COMMIT;
