-- 028: drop the device registry.
--
-- ⚠️  DESTRUCTIVE — deletes every row in `devices` and `book_availability`.
--     There is no down-migration. Recovery is git: the CREATE statements are
--     in 021 (lines 165–183), and the route/service/repository layer that
--     drove them is in the commit that added this file.
--
-- Run:  psql "$DATABASE_URL" -f migrations/028_drop_devices.sql
--
-- WHY
--
-- The per-device book-availability feature was built end to end — 7 endpoints,
-- `deviceService`, `deviceRepository`, zod validation, a per-user quota, and
-- these two tables — and then never wired into a client. Neither frontend ever
-- generated a `deviceId`, called `POST /api/devices`, or marked a book
-- available. The tables have only ever been empty in practice.
--
-- The application layer was deleted first (see `src/app.js`, and the removal
-- notes in `API_ROUTES.md`); this migration removes the storage behind it. The
-- library's "you have this book, but not on this device" state does not depend
-- on either table — it is derived client-side by comparing the backend book
-- list against what is present in local IndexedDB / `documents/books/`.
--
-- WHAT IS LOST
--
--   devices            (device_id, user_id) PK · name · last_seen_at · created_at
--   book_availability  (user_id, device_id, book_id) PK · available_at
--
-- Nothing outside the pair references either table: `book_availability` FKs to
-- `devices` and to `book_progress`, and no third table FKs to either of them.
-- So dropping them cascades to nothing else. `book_progress`, `bookmarks` and
-- every other user-data table are untouched.
--
-- ON RE-RUNNING
--
-- `scripts/migrate.sh` replays the whole chain every time and has no
-- applied-state tracking, so 021 will recreate these tables and this file will
-- drop them again on each run. That is the same create-then-drop shape the
-- chain already has for `_jlpt_raw` (created by 010, dropped by 012), and it is
-- why both sides use IF EXISTS / IF NOT EXISTS. The net schema is correct.

BEGIN;

-- Dependency order: book_availability holds the FK into devices, so it goes
-- first. CASCADE is belt-and-braces — with nothing else referencing them, a
-- plain DROP would succeed too.
DROP TABLE IF EXISTS book_availability CASCADE;
DROP TABLE IF EXISTS devices           CASCADE;

COMMIT;
