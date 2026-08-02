const pool = require("../db");

// Both deck reads return the same two derived fields, so the SQL is written
// once here rather than twice inline.
//
// `card_count` is a scalar subquery instead of the `LEFT JOIN cards` +
// `GROUP BY d.id` it used to be: aggregating over a join can't coexist with
// the lateral below without dragging every one of its output columns into the
// GROUP BY. Two independent subqueries are also easier to read than one
// grouped join doing two jobs, and both hit `idx_cards_deck_id`.
const CARD_COUNT = `(SELECT COUNT(*)::int FROM cards c WHERE c.deck_id = d.id) AS card_count`;

// The most recently added card, as one JSON object (null for an empty deck) —
// what the decks screen shows under "Last Added Word". A lateral keeps it to a
// single round trip for the whole list; the alternative was the client
// fetching every deck's full card inventory to read one row off the end.
//
// Only the columns that surface are selected: `state` drives the mastery chip
// and `created_at` lets a caller tell how stale the row is. Part of speech
// isn't in the schema, so the design's `READING · POS` line renders the
// reading alone.
//
// `id DESC` breaks ties on `created_at`, which is only ever equal when several
// cards are inserted inside the same transaction — without it the "last" card
// would be arbitrary between two identical timestamps and could differ between
// requests.
const LAST_CARD = `LEFT JOIN LATERAL (
         SELECT json_build_object(
                  'id',         c.id,
                  'front',      c.front,
                  'reading',    c.reading,
                  'back',       c.back,
                  'state',      c.state,
                  'created_at', c.created_at
                ) AS last_card
         FROM cards c
         WHERE c.deck_id = d.id
         ORDER BY c.created_at DESC, c.id DESC
         LIMIT 1
       ) lc ON TRUE`;

module.exports = {
  create: async ({ userId, name, description }) => {
    const result = await pool.query(
      `INSERT INTO decks (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, description || ""]
    );
    return result.rows[0];
  },

  /** How many decks this user owns. Backs the per-user deck quota —
   *  counted in SQL so the check doesn't pull whole rows (with their
   *  card_count subquery and last_card lateral) to measure `.length`. */
  countByUser: async (userId) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM decks WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.count ?? 0;
  },

  findByUser: async (userId) => {
    const result = await pool.query(
      `SELECT d.*, ${CARD_COUNT}, lc.last_card
       FROM decks d
       ${LAST_CARD}
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query(
      `SELECT d.*, ${CARD_COUNT}, lc.last_card
       FROM decks d
       ${LAST_CARD}
       WHERE d.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  update: async (id, { name, description }) => {
    const result = await pool.query(
      `UPDATE decks
       SET name        = COALESCE($2, name),
           description = COALESCE($3, description)
       WHERE id = $1
       RETURNING *`,
      [id, name ?? null, description ?? null]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await pool.query(
      `DELETE FROM decks WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};
