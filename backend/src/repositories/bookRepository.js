const pool = require("../db");

module.exports = {
  // ── book_progress ─────────────────────────────────────────────────────────

  createBook: async ({ userId, filename, title, author, coverColor, fileHash, contentHash, dcIdentifier, language, publisher }) => {
    const result = await pool.query(
      `INSERT INTO book_progress (user_id, filename, title, author, cover_color, file_hash, content_hash, dc_identifier, language, publisher)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, filename, title, author || "", coverColor || "#4A4038", fileHash || null, contentHash || null, dcIdentifier || null, language || null, publisher || null]
    );
    return result.rows[0];
  },

  findBooksByUser: async (userId) => {
    const result = await pool.query(
      `SELECT * FROM book_progress WHERE user_id = $1 ORDER BY last_read_at DESC`,
      [userId]
    );
    return result.rows;
  },

  findBookById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM book_progress WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  findBookByUserAndFilename: async (userId, filename) => {
    const result = await pool.query(
      `SELECT * FROM book_progress WHERE user_id = $1 AND filename = $2`,
      [userId, filename]
    );
    return result.rows[0];
  },

  updateBookProgress: async (id, { cfiPosition, progress, spineIndex, totalSpineItems }) => {
    const result = await pool.query(
      `UPDATE book_progress
       SET cfi_position      = COALESCE($2, cfi_position),
           progress           = COALESCE($3, progress),
           spine_index        = COALESCE($4, spine_index),
           total_spine_items  = COALESCE($5, total_spine_items),
           last_read_at       = now()
       WHERE id = $1
       RETURNING *`,
      [id, cfiPosition ?? null, progress ?? null, spineIndex ?? null, totalSpineItems ?? null]
    );
    return result.rows[0];
  },

  updateBookTitle: async (id, title) => {
    const result = await pool.query(
      `UPDATE book_progress SET title = $2 WHERE id = $1 RETURNING *`,
      [id, title]
    );
    return result.rows[0];
  },

  updateBookIdentity: async (id, { fileHash, contentHash, dcIdentifier, language, publisher }) => {
    const result = await pool.query(
      `UPDATE book_progress
       SET file_hash      = COALESCE($2, file_hash),
           content_hash   = COALESCE($3, content_hash),
           dc_identifier  = COALESCE($4, dc_identifier),
           language        = COALESCE($5, language),
           publisher       = COALESCE($6, publisher)
       WHERE id = $1
       RETURNING *`,
      [id, fileHash ?? null, contentHash ?? null, dcIdentifier ?? null, language ?? null, publisher ?? null]
    );
    return result.rows[0];
  },

  deleteBook: async (id) => {
    const result = await pool.query(
      `DELETE FROM book_progress WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};
