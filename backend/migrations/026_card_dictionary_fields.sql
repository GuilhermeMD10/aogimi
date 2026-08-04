-- 026: carry the dictionary entry's own facts onto the card.
--
-- WHY: a card was created from a dictionary entry but kept none of that
-- entry's structure — only `front` (the headword) and `back` (one flattened
-- string of glosses). So the study screens had nothing to render a JLPT chip
-- from, and nothing to lay the glosses out as separate lines with; they had to
-- either re-query the dictionary per card or split `back` on punctuation and
-- hope. Both are guesses about data we had at add time and threw away.
--
--   * `jlpt_level` — a SNAPSHOT of the source entry's JLPT tier, captured when
--     the card is added. Deliberately not a live join to the dictionary
--     tables: the card's front is user-editable free text, so a join would
--     silently stop resolving the moment someone fixes a typo. Editing a card
--     does NOT recompute this — the value is allowed to go stale (the write
--     path is COALESCE, same as every other card field). NULL means "unknown",
--     which covers both "the word is on no JLPT list" and "card predates this
--     column"; nothing distinguishes the two and nothing needs to.
--
--   * `meanings` — the first few glosses as separate items, so the client can
--     render them as a list. `back` is KEPT as-is (still NOT NULL, still
--     required by zod) and remains what every existing client reads; its
--     eventual retirement is a separate, later change. Do not treat it as
--     dead.
--
-- NO BACKFILL, on purpose. Deriving a tier for existing rows would mean
-- joining `cards.front` against the dictionary's `kanji_for_word` /
-- `readings`, which is ambiguous (one surface form maps to several entries at
-- different tiers) — and a wrong tier renders as an authoritative chip.
-- Existing rows get jlpt_level = NULL and meanings = '{}'. Likewise no
-- backfill of `back` into `meanings`: splitting a flattened gloss string back
-- into items is the same kind of guess.
--
-- No new index: neither column is ever a search predicate. `meanings` is
-- read alongside the row it belongs to, and JLPT filtering happens client-side
-- over an already-fetched deck.
--
-- (Note for the reader: there is also a read-only *dictionary table* called
-- `meanings`. `cards.meanings` below is a column and unrelated to it.)
--
-- Idempotent: re-running after a partial apply is safe. Constraint names match
-- what the inline CHECKs in reset_user_data.sql auto-generate, so the two
-- files describe the same schema (that reset script is updated in lockstep —
-- standing house rule for any migration touching user-data tables).
--
-- Run:  psql "$DATABASE_URL" -f migrations/026_card_dictionary_fields.sql

BEGIN;

-- JLPT tiers run N5 (easiest) .. N1 (hardest), stored as the bare number
-- 5..1 — the same encoding as the dictionary side's `words.jlpt_level`.
-- Mirrored in src/config/limits.js (NUMBERS.JLPT_LEVEL_MIN / _MAX) and
-- enforced by zod on write; this CHECK is the backstop for a future route or
-- a manual psql session.
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS jlpt_level smallint;

-- Written as a separate idempotent step: ADD COLUMN IF NOT EXISTS silently
-- skips its inline constraints when the column already exists, so a
-- half-applied run would leave the column unconstrained.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'cards'::regclass AND conname = 'cards_jlpt_level_check'
  ) THEN
    ALTER TABLE cards
      ADD CONSTRAINT cards_jlpt_level_check
      CHECK (jlpt_level IS NULL OR jlpt_level BETWEEN 1 AND 5);
  END IF;
END $$;

-- text[], not jsonb: these are flat strings with no keys, and text[] keeps
-- them readable in psql and indexable if that ever becomes necessary.
--
-- NOT NULL DEFAULT '{}' is load-bearing, not tidiness: the web client types
-- this as a non-nullable `string[]`, so every read site can map over it
-- directly instead of writing `?? []` at each one. A nullable column would
-- push that guard into ~6 call sites where forgetting it is a runtime crash.
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS meanings text[] NOT NULL DEFAULT '{}'::text[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'cards'::regclass AND conname = 'cards_meanings_check'
  ) THEN
    -- `coalesce` is required, not defensive: array_length() returns NULL (not
    -- 0) for an empty array, and `NULL <= 3` evaluates to NULL, which a CHECK
    -- treats as "not violated" — so the bare form would happen to pass for
    -- '{}' by accident rather than by rule. coalesce(..., 0) makes the empty
    -- case an explicit, deliberate 0 <= 3.
    --
    -- Only the ITEM COUNT is enforced here. Per-item length (TEXT.CARD_MEANING
    -- in src/config/limits.js) is zod-only: expressing it in SQL needs a
    -- subquery-free scalar over the array, which in a CHECK means an
    -- unnest-in-a-subquery (not allowed) or a custom IMMUTABLE function — a
    -- schema-level dependency to enforce a number that already has one
    -- authoritative home. The count is cheap to express and is the bound that
    -- actually protects the row size.
    ALTER TABLE cards
      ADD CONSTRAINT cards_meanings_check
      CHECK (coalesce(array_length(meanings, 1), 0) <= 3);
  END IF;
END $$;

COMMIT;
