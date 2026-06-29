-- Card scheduling: add `next_due_at`, the timestamp a card next becomes due
-- for review. Recomputed on every review from the post-review stability:
--
--   next_due_at = last_reviewed_at + stability * ln(1 / TARGET_RETENTION) days
--
-- TARGET_RETENTION (0.9) lives in src/services/cardSrsService.js — a card is
-- "due" once its retrievability has decayed to that value. The 0.10536 factor
-- below is ln(1 / 0.9); keep it in sync if TARGET_RETENTION changes.
--
-- A NULL next_due_at means "never reviewed" → treated as due now.
--
-- Idempotent: re-running after a partial apply is safe.

BEGIN;

ALTER TABLE cards ADD COLUMN IF NOT EXISTS next_due_at timestamptz;

-- Backfill scheduled due times for cards reviewed at least once. Never-reviewed
-- cards keep next_due_at = NULL (due now). Only fills NULLs, so re-running is
-- safe and won't clobber values written by the review endpoint.
UPDATE cards
   SET next_due_at = last_reviewed_at + (stability * 0.10536) * interval '1 day'
 WHERE last_reviewed_at IS NOT NULL
   AND next_due_at IS NULL;

-- "Due cards for a deck" filters WHERE deck_id = $1 AND next_due_at <= now()
-- and orders by next_due_at; this index serves both.
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards (deck_id, next_due_at);

COMMIT;
