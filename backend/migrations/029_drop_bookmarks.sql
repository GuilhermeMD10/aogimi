-- 029: drop reader bookmarks.
--
-- ⚠️  DESTRUCTIVE — deletes every row in `bookmarks`. Unlike 028's tables,
--     this one held real data: the mobile reader created bookmarks and synced
--     them here. There is no down-migration. Recovery is git: the CREATE
--     statement is in 021 (lines 123–131), and the route/service/repository
--     layer plus the mobile client that drove it are in the commit that added
--     this file.
--
-- Run:  psql "$DATABASE_URL" -f migrations/029_drop_bookmarks.sql
--
-- WHY
--
-- Bookmarks, highlights and annotations were removed from the product. The web
-- reader dropped them first (it kept no highlight store at all); the mobile
-- reader was the last consumer — its bookmark picker, annotations pane and
-- offline sync queue are gone as of this change. With no client creating or
-- reading bookmarks, the endpoints (`POST`/`GET /api/books/:id/bookmarks`,
-- `DELETE /api/books/bookmarks/:id`), `bookmarkService`, `bookmarkRepository`,
-- the `bookmarkOwnedBy` ownership check, the per-book quota and the zod schema
-- were all deleted. This migration removes the storage behind them.
--
-- Reading POSITION is unaffected. `book_progress.cfi_position` is a separate
-- column on a separate table and is still written by both clients — losing
-- bookmarks does not lose "where I was in this book".
--
-- WHAT IS LOST
--
--   bookmarks  id (uuid PK) · book_id → book_progress(id) · cfi · label
--              · created_at
--
-- Nothing references `bookmarks`: its own FK points out, at `book_progress`,
-- and no other table FKs into it. So the drop cascades to nothing else.
-- `book_progress` and every other user-data table are untouched.
--
-- ON RE-RUNNING
--
-- `scripts/migrate.sh` replays the whole chain every time and has no
-- applied-state tracking, so 021 will recreate this table and this file will
-- drop it again on each run — the same create-then-drop shape 028 has for the
-- device registry, and why both sides use IF EXISTS / IF NOT EXISTS. The net
-- schema is correct.

BEGIN;

-- CASCADE is belt-and-braces: with nothing referencing `bookmarks`, a plain
-- DROP would succeed too. The index goes with the table.
DROP TABLE IF EXISTS bookmarks CASCADE;

COMMIT;
