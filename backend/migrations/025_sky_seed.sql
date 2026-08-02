-- 025: per-user sky seed.
--
-- One immutable 16-hex-char seed per user, minted at row creation. The star
-- map ("sky") derives every star position deterministically from
-- (sky_seed, deck uuid, card uuid), so the same account sees the same sky on
-- every device without a single position being stored.
--
-- A DB default rather than app code so every insert path gets one. The
-- default is volatile, which makes ADD COLUMN evaluate it per row — existing
-- users are backfilled with DISTINCT seeds by this migration, not one shared
-- value. 16 hex chars: the client folds the seed to 32 bits (FNV-1a), so
-- entropy past ~8 chars buys nothing — the extra length is legibility and
-- headroom if the hash is ever widened.
--
-- Deliberately NOT in the PATCH /api/user allow-list: changing the seed
-- rearranges the user's entire sky. A future "reroll my sky" feature gets
-- its own endpoint, not a writable column.

ALTER TABLE users
  ADD COLUMN sky_seed text NOT NULL
  DEFAULT substr(md5(gen_random_uuid()::text), 1, 16);
