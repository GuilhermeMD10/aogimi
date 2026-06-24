// Resource ownership checks. Every protected route that operates on a
// `:id` path param needs to verify the resource belongs to the caller
// — otherwise a valid JWT for user A could be replayed with user B's
// resource id and the route would happily comply.
//
// Each helper returns a boolean. Routes use 404 (not 403) on a false
// return so non-existence and not-owned look identical to the client —
// no oracle for enumerating other users' resources.

const pool = require("../db");

async function bookOwnedBy(userId, bookId) {
  const r = await pool.query(
    "SELECT 1 FROM book_progress WHERE id = $1 AND user_id = $2",
    [bookId, userId],
  );
  return r.rowCount > 0;
}

async function deckOwnedBy(userId, deckId) {
  const r = await pool.query(
    "SELECT 1 FROM decks WHERE id = $1 AND user_id = $2",
    [deckId, userId],
  );
  return r.rowCount > 0;
}

async function cardOwnedBy(userId, cardId) {
  const r = await pool.query(
    `SELECT 1 FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = $1 AND d.user_id = $2`,
    [cardId, userId],
  );
  return r.rowCount > 0;
}

async function bookmarkOwnedBy(userId, bookmarkId) {
  const r = await pool.query(
    `SELECT 1 FROM bookmarks bm
     JOIN book_progress bp ON bp.id = bm.book_id
     WHERE bm.id = $1 AND bp.user_id = $2`,
    [bookmarkId, userId],
  );
  return r.rowCount > 0;
}

async function deviceOwnedBy(userId, deviceId) {
  const r = await pool.query(
    "SELECT 1 FROM devices WHERE device_id = $1 AND user_id = $2",
    [deviceId, userId],
  );
  return r.rowCount > 0;
}

module.exports = {
  bookOwnedBy,
  deckOwnedBy,
  cardOwnedBy,
  bookmarkOwnedBy,
  deviceOwnedBy,
};
