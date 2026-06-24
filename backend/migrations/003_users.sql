-- Users table for authentication.
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id         serial       PRIMARY KEY,
  username   text         NOT NULL UNIQUE,
  password   text         NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now()
);

COMMIT;
