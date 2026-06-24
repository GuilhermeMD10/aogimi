-- Migration 005: Rename user_books → book_progress with revised schema.
--
-- ⚠️  DESTRUCTIVE — drops user_books and its dependents (bookmarks FK).
-- Run manually:
--   psql -d aogimi -f migrations/005_book_progress.sql
--
-- To just nuke the old table without the migration:
--   DROP TABLE IF EXISTS bookmarks CASCADE;
--   ALTER TABLE IF EXISTS decks DROP COLUMN IF EXISTS book_id;
--   DROP TABLE IF EXISTS user_books CASCADE;

BEGIN;

-- ── Remove old table and dependents ─────────────────────────────────────────

-- bookmarks has FK → user_books(id), must drop first
DROP TABLE IF EXISTS bookmarks CASCADE;

-- decks has an optional FK → user_books(id) — drop column
ALTER TABLE decks DROP COLUMN IF EXISTS book_id;

-- Now drop the old table
DROP TABLE IF EXISTS user_books CASCADE;

-- ── book_progress ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_progress (
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

CREATE INDEX IF NOT EXISTS idx_book_progress_user_id ON book_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_book_progress_last_read ON book_progress (user_id, last_read_at DESC);

-- ── Recreate bookmarks pointing to book_progress ────────────────────────────

CREATE TABLE IF NOT EXISTS bookmarks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid         NOT NULL REFERENCES book_progress(id) ON DELETE CASCADE,
  cfi         text         NOT NULL,
  label       text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks (book_id);

COMMIT;
