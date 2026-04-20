-- Reset all user-data tables.
-- Drops everything and recreates with the current correct schema.
--
-- Run manually:
--   psql -d langeco -f migrations/reset_user_data.sql

BEGIN;

-- ── Drop in dependency order ────────────────────────────────────────────────

DROP TABLE IF EXISTS cards         CASCADE;
DROP TABLE IF EXISTS bookmarks     CASCADE;
DROP TABLE IF EXISTS decks         CASCADE;
DROP TABLE IF EXISTS book_progress CASCADE;
DROP TABLE IF EXISTS user_books    CASCADE;   -- legacy, if still lingering
DROP TABLE IF EXISTS users         CASCADE;

-- ── users ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id           serial       PRIMARY KEY,
  username     text         NOT NULL UNIQUE,
  password     text         NOT NULL,
  display_name text,
  email        text,
  language     text         NOT NULL DEFAULT 'en',
  avatar_index smallint     NOT NULL DEFAULT 0,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- ── book_progress ───────────────────────────────────────────────────────────

CREATE TABLE book_progress (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename          text         NOT NULL,
  title             text         NOT NULL,
  author            text         NOT NULL DEFAULT '',
  cover_color       text         NOT NULL DEFAULT '#4A4038',
  cfi_position      text,
  spine_index       smallint     NOT NULL DEFAULT 0,
  total_spine_items smallint,
  progress          smallint     NOT NULL DEFAULT 0,
  started_at        timestamptz  NOT NULL DEFAULT now(),
  last_read_at      timestamptz  NOT NULL DEFAULT now(),
  created_at        timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, filename)
);

CREATE INDEX idx_book_progress_user_id   ON book_progress (user_id);
CREATE INDEX idx_book_progress_last_read ON book_progress (user_id, last_read_at DESC);

-- ── bookmarks ───────────────────────────────────────────────────────────────

CREATE TABLE bookmarks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid         NOT NULL REFERENCES book_progress(id) ON DELETE CASCADE,
  cfi         text         NOT NULL,
  label       text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookmarks_book_id ON bookmarks (book_id);

-- ── decks ───────────────────────────────────────────────────────────────────

CREATE TABLE decks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text         NOT NULL,
  description text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_decks_user_id ON decks (user_id);

-- ── cards ───────────────────────────────────────────────────────────────────

CREATE TABLE cards (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id         uuid         NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front           text         NOT NULL,
  reading         text         NOT NULL DEFAULT '',
  back            text         NOT NULL,
  notes           text         NOT NULL DEFAULT '',
  state           text         NOT NULL DEFAULT 'new',
  reviewed_times  int          NOT NULL DEFAULT 0,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_deck_id ON cards (deck_id);
CREATE INDEX idx_cards_state   ON cards (deck_id, state);

COMMIT;
