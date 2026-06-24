-- Recompute words.priority_score with a diminishing-returns formula, mirroring
-- the approach used by jpdict-idb (10ten Japanese Reader).
--
-- Before: every matching JMdict priority tag added its full weight, so a word
-- flagged ichi1 + news1 + spec1 summed to ~90 and dominated the tiebreaker
-- alongside other multi-tagged words.
--
-- After: the strongest tag contributes 100%, the next 10%, the next 1%, etc.
-- Effect: a single strong attestation (ichi1 = 50) roughly equals multi-source
-- agreement, preventing pile-on and better distinguishing genuinely rare
-- words from over-tagged ones.
--
-- Safe to re-run — the UPDATE overwrites every row, no idempotent guard.

BEGIN;

WITH markers AS (
  SELECT w.id AS word_id,
         string_agg(coalesce(wk.priority, ''), ',')
           || ',' || coalesce(string_agg(coalesce(wr.priority, ''), ','), '') AS prio
  FROM words w
  LEFT JOIN word_kanji    wk ON wk.word_id = w.id
  LEFT JOIN word_readings wr ON wr.word_id = w.id
  GROUP BY w.id
),
contribs AS (
  SELECT word_id,
         -- Per-tag contributions (NULL when the tag is absent). array_remove
         -- below drops NULLs so unnest only sees real scores.
         array_remove(ARRAY[
           CASE WHEN prio LIKE '%ichi1%' THEN 50 END,
           CASE WHEN prio LIKE '%news1%' THEN 40 END,
           CASE WHEN prio LIKE '%gai1%'  THEN 30 END,
           CASE WHEN prio LIKE '%spec1%' THEN 20 END,
           CASE
             WHEN prio ~ 'nf0[1-5]([^0-9]|$)'         THEN 20
             WHEN prio ~ 'nf(0[6-9]|1[0-2])([^0-9]|$)' THEN 10
             WHEN prio ~ 'nf(1[3-9]|2[0-4])([^0-9]|$)' THEN 5
           END
         ], NULL) AS vals
  FROM markers
),
sorted AS (
  SELECT word_id,
         (SELECT array_agg(v ORDER BY v DESC) FROM unnest(vals) AS v) AS s
  FROM contribs
)
UPDATE words w
SET priority_score = LEAST(100, (
    COALESCE(s.s[1], 0)
  + COALESCE(s.s[2], 0) * 0.1
  + COALESCE(s.s[3], 0) * 0.01
  + COALESCE(s.s[4], 0) * 0.001
  + COALESCE(s.s[5], 0) * 0.0001
  + CASE WHEN w.is_common THEN 10 ELSE 0 END
))::smallint
FROM sorted s
WHERE s.word_id = w.id;

COMMIT;
