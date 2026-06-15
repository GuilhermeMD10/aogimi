-- Migration 021: Auth hardening.
--
-- Replaces the plaintext `password` column with a bcrypt-hashed
-- `password_hash`, lays out a case-insensitive unique constraint on
-- email (kept nullable for now since signup forms don't collect it
-- yet — see DECISIONS), and adds the `refresh_tokens` table used by
-- the JWT refresh-token rotation flow.
--
-- Password-reset tokens are intentionally NOT added — that feature is
-- deferred. Users who forget their password will need to wait until
-- the reset flow lands.
--
-- Clean-slate: this migration drops users (and the cascading user-data
-- tables) so old plaintext password rows don't survive. The matching
-- DROP+CREATE in reset_user_data.sql has been updated in lockstep.
--
-- Run manually:
--   psql "$DATABASE_URL" -f migrations/021_auth_hardening.sql

BEGIN;

-- ── Wipe user data so old plaintext passwords don't linger ────────────────
-- Order matters — drop the deepest dependents first. Each one is also
-- ON DELETE CASCADE so a plain `DROP TABLE users CASCADE` would also
-- work; keeping it explicit makes the migration self-documenting.

DROP TABLE IF EXISTS book_availability  CASCADE;
DROP TABLE IF EXISTS devices            CASCADE;
DROP TABLE IF EXISTS cards              CASCADE;
DROP TABLE IF EXISTS bookmarks          CASCADE;
DROP TABLE IF EXISTS decks              CASCADE;
DROP TABLE IF EXISTS book_progress      CASCADE;
DROP TABLE IF EXISTS refresh_tokens     CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- ── users (new shape) ──────────────────────────────────────────────────────

CREATE TABLE users (
  id                    serial       PRIMARY KEY,
  username              text         NOT NULL UNIQUE,
  password_hash         text         NOT NULL,
  email                 text,
  display_name          text,
  language              text         NOT NULL DEFAULT 'en',
  avatar_index          smallint     NOT NULL DEFAULT 0,
  onboarding_completed  boolean      NOT NULL DEFAULT false,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on email — only enforces uniqueness
-- on rows where email is set. Future-proofs the column for the email-
-- based identity model if we ever switch off username-as-login.
CREATE UNIQUE INDEX users_email_lower_idx
  ON users (LOWER(email))
  WHERE email IS NOT NULL;

-- ── refresh_tokens ─────────────────────────────────────────────────────────
-- Stores SHA-256 hashes of refresh tokens (NEVER the raw token). Rotation
-- on every /auth/refresh marks the old row revoked and inserts a new one.
-- /auth/logout marks the active row revoked.

CREATE TABLE refresh_tokens (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text         NOT NULL UNIQUE,
  expires_at  timestamptz  NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id   ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- ── book_progress ──────────────────────────────────────────────────────────

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
  file_hash         text,
  content_hash      text,
  pdf_id_original   text,
  pdf_id_current    text,
  page_count        int,
  has_text_layer    boolean,
  producer          text,
  xmp_document_id   text,
  xmp_original_id   text,
  page_hashes       text[],
  text_length       int,
  detected_doi      text,
  detected_isbn     text,
  page_phashes      text[],
  fingerprint_version int        NOT NULL DEFAULT 1,
  dc_identifier     text,
  language          text,
  publisher         text,
  started_at        timestamptz  NOT NULL DEFAULT now(),
  last_read_at      timestamptz  NOT NULL DEFAULT now(),
  created_at        timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, filename)
);

CREATE INDEX idx_book_progress_user_id           ON book_progress (user_id);
CREATE INDEX idx_book_progress_last_read         ON book_progress (user_id, last_read_at DESC);
CREATE INDEX idx_book_progress_file_hash         ON book_progress (file_hash)         WHERE file_hash IS NOT NULL;
CREATE INDEX idx_book_progress_content_hash      ON book_progress (content_hash)      WHERE content_hash IS NOT NULL;
CREATE INDEX idx_book_progress_pdf_id_original   ON book_progress (pdf_id_original)   WHERE pdf_id_original IS NOT NULL;
CREATE INDEX idx_book_progress_xmp_original_id   ON book_progress (xmp_original_id)   WHERE xmp_original_id IS NOT NULL;
CREATE INDEX idx_book_progress_detected_doi      ON book_progress (detected_doi)      WHERE detected_doi IS NOT NULL;
CREATE INDEX idx_book_progress_detected_isbn     ON book_progress (detected_isbn)     WHERE detected_isbn IS NOT NULL;

-- ── bookmarks ──────────────────────────────────────────────────────────────

CREATE TABLE bookmarks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid         NOT NULL REFERENCES book_progress(id) ON DELETE CASCADE,
  cfi         text         NOT NULL,
  label       text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookmarks_book_id ON bookmarks (book_id);

-- ── decks ──────────────────────────────────────────────────────────────────

CREATE TABLE decks (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text         NOT NULL,
  description text         NOT NULL DEFAULT '',
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_decks_user_id ON decks (user_id);

-- ── cards ──────────────────────────────────────────────────────────────────

CREATE TABLE cards (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id           uuid         NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front             text         NOT NULL,
  reading           text         NOT NULL DEFAULT '',
  back              text         NOT NULL,
  notes             text         NOT NULL DEFAULT '',
  context_sentence  text         NOT NULL DEFAULT '',
  state             text         NOT NULL DEFAULT 'new',
  reviewed_times    int          NOT NULL DEFAULT 0,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_deck_id ON cards (deck_id);
CREATE INDEX idx_cards_state   ON cards (deck_id, state);

-- ── devices ────────────────────────────────────────────────────────────────

CREATE TABLE devices (
  device_id    text         NOT NULL,
  user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text         NOT NULL DEFAULT '',
  last_seen_at timestamptz  NOT NULL DEFAULT now(),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, user_id)
);

-- ── book_availability ──────────────────────────────────────────────────────

CREATE TABLE book_availability (
  user_id      int          NOT NULL,
  device_id    text         NOT NULL,
  book_id      uuid         NOT NULL REFERENCES book_progress(id) ON DELETE CASCADE,
  available_at timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id, book_id),
  FOREIGN KEY (device_id, user_id) REFERENCES devices(device_id, user_id) ON DELETE CASCADE
);

COMMIT;
