-- 024: constrain cards.state to the SRS ladder.
--
-- WHY: `PUT /api/decks/cards/:cardId` passed `state` straight into
-- `COALESCE($6, state)` with no validation, and the column had no CHECK —
-- unlike `card_reviews.outcome`, which has had one since 022. So any client
-- holding a valid token could write an arbitrary string:
--
--   * `{"state":"mastered"}` skipped the entire SRS progression
--   * garbage broke `statsService.getCards` (which buckets by state),
--     `idx_cards_state`, and the web client's rank rendering
--     (`features/study/decks/lib/rankProgress.ts`)
--
-- `src/validation/decks.js` now rejects it at the route. This constraint is
-- the backstop: a future route, a manual psql session, or a script can't
-- reintroduce the problem.
--
-- Manual re-grading via the API is still allowed — that's deliberate. What's
-- no longer possible is writing a value the rest of the system can't read.
--
-- Run:  psql "$DATABASE_URL" -f migrations/024_card_state_check.sql

BEGIN;

-- Any row written before the constraint existed. Unknown values collapse to
-- 'new' — the column default and the only state that carries no false claim
-- about the user's progress (the alternative, guessing from reviewed_times,
-- would invent history). Expected to affect 0 rows on a healthy DB; the
-- UPDATE is here so the ALTER below can't fail on legacy data.
UPDATE cards
   SET state = 'new'
 WHERE state NOT IN ('new', 'seen', 'learned', 'mastered');

ALTER TABLE cards
  ADD CONSTRAINT cards_state_check
  CHECK (state IN ('new', 'seen', 'learned', 'mastered'));

-- `card_reviews.state_before` / `state_after` are an append-only audit log of
-- what the app observed at the time, deliberately left unconstrained: a CHECK
-- there would rewrite history rather than record it, and nothing reads those
-- columns as an enum.

COMMIT;
