-- Dictionary base schema.
--
-- The JMdict / KANJIDIC2 / JMnedict tables were historically created
-- by the parser scripts in `helpers/files/` (`schema.sql` there is the
-- canonical reference). The downstream migrations (001 search refactor,
-- 002 backfill, 008 priority, 009 gloss-norm, etc.) ALTER these tables
-- and assume they already exist — so a fresh DB that's never run the
-- parser would break on migration 001 with "relation \"words\" does
-- not exist", aborting the rest of the chain inside the same
-- transaction.
--
-- This file creates the base tables (no data) so the chain works on
-- any empty database. Every statement is idempotent — running this on
-- a DB that already has the dict schema is a no-op.
--
-- Numbered `000_` so it runs before any historical migration.

BEGIN;

-- ── words (JMdict) ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS words (
  id         SERIAL  PRIMARY KEY,
  jmdict_id  INT     UNIQUE NOT NULL,        -- original <ent_seq>
  is_common  BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS word_kanji (
  id        SERIAL PRIMARY KEY,
  word_id   INT    NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  kanji     TEXT   NOT NULL,
  priority  TEXT                              -- e.g. "news1,nf22"
);

CREATE TABLE IF NOT EXISTS word_readings (
  id        SERIAL PRIMARY KEY,
  word_id   INT    NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  kana      TEXT   NOT NULL,
  priority  TEXT
);

CREATE TABLE IF NOT EXISTS word_meanings (
  id       SERIAL PRIMARY KEY,
  word_id  INT    NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  meaning  TEXT   NOT NULL,
  pos      TEXT,
  lang     TEXT   NOT NULL DEFAULT 'eng'
);

-- ── kanji (KANJIDIC2) ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kanji (
  literal      TEXT PRIMARY KEY,
  grade        INT,
  stroke_count INT,
  radical      INT,
  unicode      TEXT,
  meaning      TEXT,
  on_readings  TEXT,
  kun_readings TEXT,
  pinyin       TEXT,
  korean_r     TEXT,
  korean_h     TEXT
);

-- ── names (JMnedict) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS names (
  id           SERIAL PRIMARY KEY,
  jmnedict_id  INT    UNIQUE NOT NULL,
  kanji        TEXT,
  kana         TEXT   NOT NULL,
  name_type    TEXT,
  meaning      TEXT
);

-- ── Base indexes ───────────────────────────────────────────────────────────
-- The search-refactor migration (001) adds more aggressive indexes on
-- top of these for ranked search. These exist so the parser can write
-- with reasonable lookup speed before 001 lands.

CREATE INDEX IF NOT EXISTS idx_word_kanji_kanji    ON word_kanji    (kanji);
CREATE INDEX IF NOT EXISTS idx_word_readings_kana  ON word_readings (kana);
CREATE INDEX IF NOT EXISTS idx_word_meanings_lang  ON word_meanings (lang);
CREATE INDEX IF NOT EXISTS idx_kanji_literal       ON kanji         (literal);
CREATE INDEX IF NOT EXISTS idx_kanji_grade         ON kanji         (grade);
CREATE INDEX IF NOT EXISTS idx_kanji_stroke        ON kanji         (stroke_count);
CREATE INDEX IF NOT EXISTS idx_names_kanji         ON names         (kanji);
CREATE INDEX IF NOT EXISTS idx_names_kana          ON names         (kana);
CREATE INDEX IF NOT EXISTS idx_names_type          ON names         (name_type);

COMMIT;
