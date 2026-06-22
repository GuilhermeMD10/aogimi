-- Reset all user-data tables.
-- Drops everything and recreates with the current correct schema.
--
-- Run manually:
--   psql -d langeco -f migrations/reset_user_data.sql

BEGIN;

-- ── Drop in dependency order ────────────────────────────────────────────────

DROP TABLE IF EXISTS book_availability CASCADE;
DROP TABLE IF EXISTS devices           CASCADE;
DROP TABLE IF EXISTS card_reviews      CASCADE;
DROP TABLE IF EXISTS study_days        CASCADE;
DROP TABLE IF EXISTS user_study_prefs  CASCADE;
DROP TABLE IF EXISTS cards             CASCADE;
DROP TABLE IF EXISTS bookmarks         CASCADE;
DROP TABLE IF EXISTS decks             CASCADE;
DROP TABLE IF EXISTS book_progress     CASCADE;
DROP TABLE IF EXISTS refresh_tokens    CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

-- ── users ───────────────────────────────────────────────────────────────────

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

CREATE UNIQUE INDEX users_email_lower_idx
  ON users (LOWER(email))
  WHERE email IS NOT NULL;

-- ── refresh_tokens ──────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text         NOT NULL UNIQUE,
  expires_at  timestamptz  NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

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
  file_hash         text,
  content_hash      text,                   -- EPUB: spine-text SHA. PDF: SHA-256 of normalized extracted text (web only; mobile null until native extraction).
  pdf_id_original   text,                   -- PDF: trailer /ID[0]. Stable across modifications.
  pdf_id_current    text,                   -- PDF: trailer /ID[1]. Changes on each save.
  page_count        int,                    -- PDF: total pages. Mobile may leave null until native parsing lands.
  has_text_layer    boolean,                -- PDF: true when extractable text exists (vs scanned image-only).
  producer          text,                   -- PDF: /Info /Producer. Diagnostic only — not used in matching.
  xmp_document_id   text,                   -- PDF: xmpMM:DocumentID. Changes on export/save-as. Forensics only.
  xmp_original_id   text,                   -- PDF: xmpMM:OriginalDocumentID. Stable across re-saves — strong cross-device match.
  page_hashes       text[],                 -- PDF: per-page SHA-256 of normalized text. Stored for deferred page-overlap match.
  text_length       int,                    -- PDF: char count of normalized full text (after header/footer strip).
  detected_doi      text,                   -- PDF: DOI scraped from first ~3 pages. Match layer (very_high).
  detected_isbn     text,                   -- PDF: ISBN-10/13 (checksum-validated). Match layer (high) paired with page_count ±5%.
  page_phashes      text[],                 -- PDF: per-sampled-page dHash (64-bit hex). Visual match layer (medium, ±10% page_count + avg hamming ≤ 8). Web only.
  fingerprint_version int        NOT NULL DEFAULT 1,  -- Version of the fingerprinting algorithm that produced this row. Bumped when the algo changes.
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
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id           uuid         NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front             text         NOT NULL,
  reading           text         NOT NULL DEFAULT '',
  back              text         NOT NULL,
  notes             text         NOT NULL DEFAULT '',
  context_sentence  text         NOT NULL DEFAULT '',
  state             text         NOT NULL DEFAULT 'new',           -- new | seen | learned | mastered
  reviewed_times    int          NOT NULL DEFAULT 0,
  difficulty        real         NOT NULL DEFAULT 0.30,            -- SRS: [0.05, 0.95]
  stability         real         NOT NULL DEFAULT 2.0,             -- SRS: days, floor 0.1
  last_outcomes     text         NOT NULL DEFAULT '',              -- last 5: A/H/E encoded
  last_reviewed_at  timestamptz,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_deck_id        ON cards (deck_id);
CREATE INDEX idx_cards_state          ON cards (deck_id, state);
CREATE INDEX idx_cards_last_reviewed  ON cards (deck_id, last_reviewed_at);

-- ── card_reviews ────────────────────────────────────────────────────────────

CREATE TABLE card_reviews (
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

CREATE INDEX idx_card_reviews_user_time ON card_reviews (user_id, reviewed_at);
CREATE INDEX idx_card_reviews_card      ON card_reviews (card_id, reviewed_at);

-- ── study_days ──────────────────────────────────────────────────────────────

CREATE TABLE study_days (
  user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  studied_on   date         NOT NULL,
  review_count int          NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, studied_on)
);

CREATE INDEX idx_study_days_user ON study_days (user_id, studied_on DESC);

-- ── user_study_prefs ────────────────────────────────────────────────────────

CREATE TABLE user_study_prefs (
  user_id        int          PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display        jsonb        NOT NULL DEFAULT '{"preset":"default","front":{"reading":false,"context":true,"jlpt":true,"deckName":true},"back":{"exampleSentence":true}}'::jsonb,
  deck_overrides jsonb        NOT NULL DEFAULT '{}'::jsonb,
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- ── devices ─────────────────────────────────────────────────────────────────

CREATE TABLE devices (
  device_id    text         NOT NULL,
  user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text         NOT NULL DEFAULT '',
  last_seen_at timestamptz  NOT NULL DEFAULT now(),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, user_id)
);

-- ── book_availability ───────────────────────────────────────────────────────

CREATE TABLE book_availability (
  user_id      int          NOT NULL,
  device_id    text         NOT NULL,
  book_id      uuid         NOT NULL REFERENCES book_progress(id) ON DELETE CASCADE,
  available_at timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id, book_id),
  FOREIGN KEY (device_id, user_id) REFERENCES devices(device_id, user_id) ON DELETE CASCADE
);

COMMIT;
