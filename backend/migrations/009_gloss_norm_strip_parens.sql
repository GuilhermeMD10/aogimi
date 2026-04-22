-- Recompute word_meanings.gloss_norm so that parenthetical content in the
-- JMdict gloss is stripped BEFORE punctuation, not left behind as extra tokens.
--
-- Example: 犬's primary gloss is "dog (Canis (lupus) familiaris)".
-- Old normalization → "dog canis lupus familiaris"  (no longer matches "dog")
-- New normalization → "dog"                         (matches cleanly)
--
-- Two regex passes handle single-level nesting (JMdict doesn't nest deeper
-- in practice). Safe to re-run: overwrites every English meaning row.

BEGIN;

UPDATE word_meanings wm
SET gloss_norm = trim(lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              split_part(wm.meaning, ';', 1),
              '\([^()]*\)', ' ', 'g'     -- strip innermost parentheticals
            ),
            '\([^()]*\)', ' ', 'g'       -- strip now-leaf parens (1 level of nesting)
          ),
          '[[:punct:]]', '', 'g'         -- drop remaining punctuation
        ),
        '\s+', ' ', 'g'                  -- collapse whitespace runs
      )
    ))
WHERE wm.lang = 'eng'
  AND wm.meaning IS NOT NULL;

COMMIT;
