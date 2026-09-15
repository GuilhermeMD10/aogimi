-- 032: idempotency key for replayed reviews.
--
-- Run:  psql "$DATABASE_URL" -f migrations/032_card_reviews_client_id.sql
--
-- WHY
--
-- Mobile now queues reviews graded offline and replays them on Sync-now /
-- reconnect. A replay that half-fails is retried, so every event carries a
-- client-minted uuid and the server treats a repeat as a no-op instead of
-- logging the review twice. Web and legacy rows have no id — the column is
-- nullable and the uniqueness is enforced only where a value is present.
--
-- The same change lets a review carry its own `reviewed_at` (the moment the
-- card was graded, not the moment the phone got back online); the service
-- re-folds a card's log when an event arrives out of order. No schema for
-- that — `card_reviews` already holds everything the fold needs.

ALTER TABLE card_reviews ADD COLUMN IF NOT EXISTS client_review_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_reviews_client_id
  ON card_reviews (client_review_id)
  WHERE client_review_id IS NOT NULL;
