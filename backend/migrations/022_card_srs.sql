-- SRS data layer: extend `cards` with FSRS-lite state, add the
-- append-only `card_reviews` event log, the `study_days` rollup, and
-- per-user display + filter prefs.
--
-- Algorithm details live in `src/services/cardSrsService.js`. Field
-- naming mirrors the JS code so reading either side reads as one
-- thought.
--
-- Idempotent: re-running after a partial apply is safe.

BEGIN;

-- ── Extend cards with SRS state ─────────────────────────────────────────────

ALTER TABLE cards ADD COLUMN IF NOT EXISTS difficulty       real         NOT NULL DEFAULT 0.30;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS stability        real         NOT NULL DEFAULT 2.0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_outcomes    text         NOT NULL DEFAULT '';
ALTER TABLE cards ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

-- ── State enum widening ─────────────────────────────────────────────────────
-- Old values: 'new' | 'learning' | 'mastered'
-- New values: 'new' | 'seen' | 'learned' | 'mastered'
-- 'learning' was the implicit "reviewed at least once" tier; map to 'seen'.

UPDATE cards SET state = 'seen' WHERE state = 'learning';

-- Cards already marked 'mastered' had to get there manually (no
-- previous algorithm assigned it). Give them a higher initial stability
-- so they don't get tagged as "fading" the moment the new algorithm
-- starts reading from this column.
UPDATE cards
   SET stability  = 21.0,
       difficulty = 0.15
 WHERE state = 'mastered';

-- Seed last_reviewed_at for any card that's been seen at least once,
-- so retrievability has a baseline anchor. created_at is a coarse
-- proxy — better than NULL.
UPDATE cards
   SET last_reviewed_at = created_at
 WHERE state IN ('seen', 'mastered')
   AND last_reviewed_at IS NULL;

-- Ordering modes need a fast index on last_reviewed_at to avoid full
-- scans when pulling "hardest" or "oldest first" sessions for a deck.
CREATE INDEX IF NOT EXISTS idx_cards_last_reviewed
  ON cards (deck_id, last_reviewed_at);

-- ── card_reviews ────────────────────────────────────────────────────────────
-- Append-only event log. Every review writes one row. Drives stats,
-- undo, heatmap, and any future algorithm retraining.

CREATE TABLE IF NOT EXISTS card_reviews (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id            uuid          NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id            int           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_at        timestamptz   NOT NULL DEFAULT now(),
  outcome            text          NOT NULL CHECK (outcome IN ('again','hard','easy')),
  difficulty_before  real          NOT NULL,
  difficulty_after   real          NOT NULL,
  stability_before   real          NOT NULL,
  stability_after    real          NOT NULL,
  state_before       text          NOT NULL,
  state_after        text          NOT NULL,
  elapsed_days       real          NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_card_reviews_user_time ON card_reviews (user_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_card_reviews_card      ON card_reviews (card_id, reviewed_at);

-- ── study_days ──────────────────────────────────────────────────────────────
-- Rollup of "the user studied at least one card on this calendar
-- date." Drives the days-studied counter and the heatmap without
-- aggregating card_reviews on every render.

CREATE TABLE IF NOT EXISTS study_days (
  user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  studied_on   date         NOT NULL,
  review_count int          NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, studied_on)
);

CREATE INDEX IF NOT EXISTS idx_study_days_user ON study_days (user_id, studied_on DESC);

-- ── user_study_prefs ────────────────────────────────────────────────────────
-- Per-user display + filter preferences. Stored as JSONB so we can add
-- new toggles without another migration. One row per user; created
-- lazily on first PUT.
--
-- display:
--   { preset: 'easy'|'default'|'hard'|'production',
--     front: { reading, context, jlpt, deckName },
--     back:  { exampleSentence } }
--
-- deck_overrides:
--   { "<deckId>": { mode: 'hardest'|'random'|'oldest_first'|... ,
--                   sessionSize: number } }

CREATE TABLE IF NOT EXISTS user_study_prefs (
  user_id        int          PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display        jsonb        NOT NULL DEFAULT '{"preset":"default","front":{"reading":false,"context":true,"jlpt":true,"deckName":true},"back":{"exampleSentence":true}}'::jsonb,
  deck_overrides jsonb        NOT NULL DEFAULT '{}'::jsonb,
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

COMMIT;
