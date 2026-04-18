const pool = require("../db");

module.exports = {
  // ── user_books ──────────────────────────────────────────────────────────────

  createBook: async ({ userId, filename, title, author, coverColor, totalPages }) => {
    const result = await pool.query(
      `INSERT INTO user_books (user_id, filename, title, author, cover_color, total_pages)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, filename, title, author || "", coverColor || "#4A4038", totalPages || null]
    );
    return result.rows[0];
  },

  findBooksByUser: async (userId) => {
    const result = await pool.query(
      `SELECT * FROM user_books WHERE user_id = $1 ORDER BY last_read_at DESC`,
      [userId]
    );
    return result.rows;
  },

  findBookById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM user_books WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  findBookByUserAndFilename: async (userId, filename) => {
    const result = await pool.query(
      `SELECT * FROM user_books WHERE user_id = $1 AND filename = $2`,
      [userId, filename]
    );
    return result.rows[0];
  },

  updateBookProgress: async (id, { cfiPosition, progress }) => {
    const result = await pool.query(
      `UPDATE user_books
       SET cfi_position = COALESCE($2, cfi_position),
           progress     = COALESCE($3, progress),
           last_read_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, cfiPosition ?? null, progress ?? null]
    );
    return result.rows[0];
  },

  deleteBook: async (id) => {
    const result = await pool.query(
      `DELETE FROM user_books WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};
