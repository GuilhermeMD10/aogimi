// Resource ownership checks. Every protected route that operates on a
// `:id` path param needs to verify the resource belongs to the caller
// — otherwise a valid JWT for user A could be replayed with user B's
// resource id and the route would happily comply.
//
// Each helper returns a boolean. Routes use 404 (not 403) on a false
// return so non-existence and not-owned look identical to the client —
// no oracle for enumerating other users' resources.

const pool = require("../db");

// Most resource ids are uuid columns. A malformed id (e.g. GET
// /api/decks/not-a-uuid) makes Postgres throw `22P02 invalid_text_
// representation`. Because the ownership check runs before the route's
// try/catch — and Express 4 doesn't catch async rejections — that would
// otherwise surface as an unhandled rejection (hung request) and a
// 404-vs-error oracle. Treating a malformed id as "not owned" (→ 404)
// keeps non-existent and malformed ids indistinguishable from not-owned,
// which is the whole point of these checks.
async function ownsBy(sql, params) {
  try {
    const r = await pool.query(sql, params);
    return r.rowCount > 0;
  } catch (err) {
    if (err && err.code === "22P02") return false;
    throw err;
  }
}

async function bookOwnedBy(userId, bookId) {
  return ownsBy(
    "SELECT 1 FROM book_progress WHERE id = $1 AND user_id = $2",
    [bookId, userId],
  );
}

async function deckOwnedBy(userId, deckId) {
  return ownsBy(
    "SELECT 1 FROM decks WHERE id = $1 AND user_id = $2",
    [deckId, userId],
  );
}

async function cardOwnedBy(userId, cardId) {
  return ownsBy(
    `SELECT 1 FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = $1 AND d.user_id = $2`,
    [cardId, userId],
  );
}

async function bookmarkOwnedBy(userId, bookmarkId) {
  return ownsBy(
    `SELECT 1 FROM bookmarks bm
     JOIN book_progress bp ON bp.id = bm.book_id
     WHERE bm.id = $1 AND bp.user_id = $2`,
    [bookmarkId, userId],
  );
}

async function deviceOwnedBy(userId, deviceId) {
  return ownsBy(
    "SELECT 1 FROM devices WHERE device_id = $1 AND user_id = $2",
    [deviceId, userId],
  );
}

module.exports = {
  bookOwnedBy,
  deckOwnedBy,
  cardOwnedBy,
  bookmarkOwnedBy,
  deviceOwnedBy,
};
