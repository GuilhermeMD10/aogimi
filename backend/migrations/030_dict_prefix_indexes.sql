-- 030: prefix indexes for Japanese partial-match search.
--
-- Non-destructive. Adds two indexes, drops nothing, reads no user data.
-- Dictionary tables only, so `reset_user_data.sql` is deliberately NOT
-- touched — it covers user-data tables and skips the dictionary.
--
-- Run:  psql "$DATABASE_URL" -f migrations/030_dict_prefix_indexes.sql
--
-- WHY
--
-- `PgSearchIndex.searchJapanesePrefix` answers "words starting with 食べ" with
-- `wk.kanji LIKE $1 || '%'`. The existing `idx_wk_kanji` / `idx_wr_kana`
-- cannot serve that query: under any collation other than C, a default
-- `text` B-tree orders by collation rules rather than byte order, so Postgres
-- will not use it for a prefix pattern. The planner falls back to a
-- sequential scan of `word_kanji` and `word_readings` — on every keystroke of
-- every dictionary search, on both the tab and the reader's lookup.
--
-- `text_pattern_ops` is the operator class that fixes exactly this: it orders
-- by raw byte comparison, which is what `LIKE 'prefix%'` needs. The existing
-- equality indexes stay — they serve `= ANY($1::text[])` in the exact path and
-- a `text_pattern_ops` index cannot answer a collation-aware `=`. So the two
-- coexist by design rather than one replacing the other.
--
-- Byte-order prefixing is exact for the queries that reach here. UTF-8 sorts
-- code points in the same order as their byte sequences, so a Japanese prefix
-- means the same thing under either ordering; and callers only reach this path
-- with kanji or kana (see `canPrefixSearch`).
--
-- CONCURRENTLY so the index builds without taking a write lock on the
-- dictionary tables. That means each statement must run OUTSIDE a transaction
-- block — psql -f does that by default. Do not wrap this file in BEGIN/COMMIT.
-- If a build is interrupted it leaves an INVALID index behind; drop it by name
-- and re-run.
--
-- Cost: roughly the size of the existing equality indexes on the same columns.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wk_kanji_prefix
  ON word_kanji (kanji text_pattern_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wr_kana_prefix
  ON word_readings (kana text_pattern_ops);

-- Refresh planner stats so the new indexes are costed correctly straight away
-- rather than after the next autovacuum pass.
ANALYZE word_kanji;
ANALYZE word_readings;
