const pool = require("../db");

module.exports = {
  create: async ({ bookId, cfi, label }) => {
    const result = await pool.query(
      `INSERT INTO bookmarks (book_id, cfi, label)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [bookId, cfi, label || ""]
    );
    return result.rows[0];
  },

  findByBook: async (bookId) => {
    const result = await pool.query(
      `SELECT * FROM bookmarks WHERE book_id = $1 ORDER BY created_at DESC`,
      [bookId]
    );
    return result.rows;
  },

  delete: async (id) => {
    const result = await pool.query(
      `DELETE FROM bookmarks WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};
