const pool = require("../db");

module.exports = {
  create: async ({ userId, bookId, name, description }) => {
    const result = await pool.query(
      `INSERT INTO decks (user_id, book_id, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, bookId || null, name, description || ""]
    );
    return result.rows[0];
  },

  findByUser: async (userId) => {
    const result = await pool.query(
      `SELECT d.*, COUNT(c.id)::int AS card_count
       FROM decks d
       LEFT JOIN cards c ON c.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      []
    );
    // Filter in query for safety
    const filtered = await pool.query(
      `SELECT d.*, COUNT(c.id)::int AS card_count
       FROM decks d
       LEFT JOIN cards c ON c.deck_id = d.id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [userId]
    );
    return filtered.rows;
  },

  findById: async (id) => {
    const result = await pool.query(
      `SELECT d.*, COUNT(c.id)::int AS card_count
       FROM decks d
       LEFT JOIN cards c ON c.deck_id = d.id
       WHERE d.id = $1
       GROUP BY d.id`,
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
