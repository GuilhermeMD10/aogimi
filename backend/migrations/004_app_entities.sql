-- App entities: user profile extensions, books, bookmarks, decks, cards.
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

BEGIN;

-- ── Extend users table with profile fields ──────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name   text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email          text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language       text NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_index   smallint NOT NULL DEFAULT 0;

-- ── user_books ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_books (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      text         NOT NULL,
  title         text         NOT NULL,
  author        text         NOT NULL DEFAULT '',
  cover_color   text         NOT NULL DEFAULT '#4A4038',
  total_pages   int,
  current_page  int          NOT NULL DEFAULT 0,
  cfi_position  text,
  progress      smallint     NOT NULL DEFAULT 0,
  started_at    timestamptz  NOT NULL DEFAULT now(),
  last_read_at  timestamptz  NOT NULL DEFAULT now(),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, filename)
);

CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books (user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_last_read ON user_books (user_id, last_read_at DESC);

-- ── bookmarks ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookmarks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid         NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
  cfi         text         NOT NULL,
  label       text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks (book_id);

-- ── decks ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS decks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     uuid         REFERENCES user_books(id) ON DELETE SET NULL,
  name        text         NOT NULL,
  description text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks (user_id);

-- ── cards ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cards (
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

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards (deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards (deck_id, state);

COMMIT;
