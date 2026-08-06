-- 027: replace FSRS-lite with real FSRS-6.
--
-- WHAT CHANGED, and why the columns can't just be reinterpreted:
--
--   * `difficulty` was [0.05, 0.95]; FSRS-6 difficulty is [1, 10]. Not a
--     rescale — the two quantities are computed from different formulas and
--     mean different things, so there is no conversion that would be honest.
--   * `stability` was multiplied by a fixed per-grade factor (0.2 / 1.2 / 3.0)
--     with no reference to difficulty, retrievability or elapsed time. The
--     numbers are in "days" only nominally.
--   * Both are now NULL until the first review — FSRS seeds them from the
--     first grade, and a default would make an unreviewed card look reviewed.
--   * `state` is now derived from stability alone (< 21 met, < 365 learned,
--     >= 365 mastered) rather than from answer streaks + a difficulty gate.
--   * `state`'s 'seen' tier is renamed 'met'.
--   * `peak_rank` is new: the high-water mark of `state`. Once a card has
--     reached 'learned' its *displayed* rank never falls again, so a lapse
--     dims a star rather than demoting it.
--   * A fourth grade, 'good', joins again/hard/easy. FSRS is fitted on a
--     four-grade distribution in which Good is the dominant success grade;
--     with three buttons there is no neutral success and the third button has
--     to stand in for it, which distorts every interval.
--
-- Algorithm details live in `src/services/fsrs.js`, verified against py-fsrs
-- 6.3.1 by `scripts/verify-fsrs.js`.
--
-- Run:  psql "$DATABASE_URL" -f migrations/027_fsrs6.sql
-- THEN: node scripts/replay-fsrs.js
--
-- This file leaves every card in a valid but *unreviewed* FSRS state. The
-- replay script rebuilds the real stability, difficulty and schedule from
-- `card_reviews`, which is complete. Running the migration without the script
-- is safe — everyone simply starts their FSRS history fresh, keeping the rank
-- they had earned — but the script is strongly preferred, and it is the
-- idempotent half of the pair.
--
-- ⚠ RE-RUNNING THIS FILE AFTER THE REPLAY UNDOES THE REPLAY. It is idempotent
-- with respect to *schema* — every ALTER is guarded, so re-running after a
-- partial apply is safe — but the data reset near the bottom unconditionally
-- NULLs stability and difficulty. That is correct exactly once. If you re-run
-- it for any reason, run `scripts/replay-fsrs.js` again afterwards; the log it
-- reads is untouched by either, so the rebuild is always available.

BEGIN;

-- ── cards: the SRS columns ──────────────────────────────────────────────────

ALTER TABLE cards ALTER COLUMN stability  DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN stability  DROP DEFAULT;
ALTER TABLE cards ALTER COLUMN difficulty DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN difficulty DROP DEFAULT;

-- The rank a card has ever reached. Seeded below from the old ladder so the
-- swap doesn't visibly demote anyone; the replay script then recomputes it
-- from the real review history.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS peak_rank text NOT NULL DEFAULT 'new';

-- ── cards.state: 'seen' → 'met' ─────────────────────────────────────────────
-- The constraint has to come off before the values can move.

ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_state_check;

UPDATE cards SET state = 'met' WHERE state = 'seen';

-- Anything outside the ladder collapses to 'new', same reasoning as migration
-- 024: unknown values must not become a claim about the user's progress.
UPDATE cards
   SET state = 'new'
 WHERE state NOT IN ('new', 'met', 'learned', 'mastered');

ALTER TABLE cards
  ADD CONSTRAINT cards_state_check
  CHECK (state IN ('new', 'met', 'learned', 'mastered'));

-- ── grandfather the earned rank, then clear the unusable numbers ────────────
-- Order matters: peak_rank is seeded from `state` while `state` still holds
-- the old ladder's answer, and only then is `state` reset.

UPDATE cards SET peak_rank = state WHERE peak_rank = 'new' AND state <> 'new';

ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_peak_rank_check;
ALTER TABLE cards
  ADD CONSTRAINT cards_peak_rank_check
  CHECK (peak_rank IN ('new', 'met', 'learned', 'mastered'));

-- Every card becomes "never reviewed" as far as FSRS is concerned: the old
-- stability and difficulty are on scales FSRS cannot read, and feeding a
-- difficulty of 0.30 into a formula expecting [1, 10] produces silent
-- nonsense rather than an error.
--
-- `last_reviewed_at` is deliberately KEPT. Nothing in FSRS reads it while
-- stability is NULL, and the `oldest_first` / `oldest_only` session modes are
-- the only things that do — losing it would throw away the one fact about
-- these cards that is still true.
--
-- `next_due_at` NULL means "due now", which is the right answer after an
-- algorithm swap: the schedule these cards were on was computed by a
-- scheduler that no longer exists.
UPDATE cards
   SET stability   = NULL,
       difficulty  = NULL,
       state       = 'new',
       next_due_at = NULL;

-- ── card_reviews: the fourth grade, and nullable "before" snapshots ─────────

ALTER TABLE card_reviews DROP CONSTRAINT IF EXISTS card_reviews_outcome_check;
ALTER TABLE card_reviews
  ADD CONSTRAINT card_reviews_outcome_check
  CHECK (outcome IN ('again', 'hard', 'good', 'easy'));

-- A first review has no "before" state to snapshot. Under the old algorithm
-- these fell back to hardcoded defaults (0.30 / 2.0), which recorded a memory
-- state the card never actually had.
ALTER TABLE card_reviews ALTER COLUMN difficulty_before DROP NOT NULL;
ALTER TABLE card_reviews ALTER COLUMN stability_before  DROP NOT NULL;

-- The log's state columns carry the same vocabulary, so the rename applies
-- here too. This is not rewriting history: 'seen' and 'met' are two names for
-- one tier, and `statsRepository`'s promotion query resolves both through
-- `array_position` against the ladder array — leaving old rows as 'seen' would
-- return NULL there and silently drop every historic upgrade from the stats.
UPDATE card_reviews SET state_before = 'met' WHERE state_before = 'seen';
UPDATE card_reviews SET state_after  = 'met' WHERE state_after  = 'seen';

-- ── indexes ─────────────────────────────────────────────────────────────────
-- Rank is read off `state` on every stats bucket and every sky mount; peak is
-- read beside it. Nothing sorts by stability, so it gets no index.

CREATE INDEX IF NOT EXISTS idx_cards_peak_rank ON cards (deck_id, peak_rank);

COMMIT;
