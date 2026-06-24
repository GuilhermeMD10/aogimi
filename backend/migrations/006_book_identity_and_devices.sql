-- Migration 006: Hash-based book identity, devices, and book availability.
--
-- Adds identity columns to book_progress for cross-device matching.
-- Adds devices and book_availability tables for per-device library state.
-- Adds onboarding_completed flag to users.
--
-- Run manually:
--   psql -d aogimi -f migrations/006_book_identity_and_devices.sql

BEGIN;

-- ── Feature 1: Hash-based book identity ─────────────────────────────────────

ALTER TABLE book_progress
  ADD COLUMN IF NOT EXISTS file_hash      text,
  ADD COLUMN IF NOT EXISTS content_hash   text,
  ADD COLUMN IF NOT EXISTS dc_identifier  text,
  ADD COLUMN IF NOT EXISTS language       text,
  ADD COLUMN IF NOT EXISTS publisher      text;

CREATE INDEX IF NOT EXISTS idx_book_progress_file_hash
  ON book_progress (file_hash) WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_book_progress_content_hash
  ON book_progress (content_hash) WHERE content_hash IS NOT NULL;

-- ── Feature 4: Per-device state ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices (
  device_id    text         NOT NULL,
  user_id      int          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text         NOT NULL DEFAULT '',
  last_seen_at timestamptz  NOT NULL DEFAULT now(),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, user_id)
);

CREATE TABLE IF NOT EXISTS book_availability (
  user_id      int          NOT NULL,
  device_id    text         NOT NULL,
  book_id      uuid         NOT NULL REFERENCES book_progress(id) ON DELETE CASCADE,
  available_at timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id, book_id),
  FOREIGN KEY (device_id, user_id) REFERENCES devices(device_id, user_id) ON DELETE CASCADE
);

-- ── Feature 6: Onboarding tracking ─────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

COMMIT;
