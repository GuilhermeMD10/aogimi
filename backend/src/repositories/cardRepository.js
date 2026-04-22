const pool = require("../db");

module.exports = {
  create: async ({ deckId, front, reading, back, notes, contextSentence }) => {
    const result = await pool.query(
      `INSERT INTO cards (deck_id, front, reading, back, notes, context_sentence)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [deckId, front, reading || "", back, notes || "", contextSentence || ""]
    );
    return result.rows[0];
  },

  findByDeck: async (deckId) => {
    const result = await pool.query(
      `SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at DESC`,
      [deckId]
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM cards WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  update: async (id, { front, reading, back, notes, state, contextSentence }) => {
    const result = await pool.query(
      `UPDATE cards
       SET front            = COALESCE($2, front),
           reading          = COALESCE($3, reading),
           back             = COALESCE($4, back),
           notes            = COALESCE($5, notes),
           state            = COALESCE($6, state),
           context_sentence = COALESCE($7, context_sentence)
       WHERE id = $1
       RETURNING *`,
      [id, front ?? null, reading ?? null, back ?? null, notes ?? null, state ?? null, contextSentence ?? null]
    );
    return result.rows[0];
  },

  incrementReviewCount: async (id) => {
    const result = await pool.query(
      `UPDATE cards SET reviewed_times = reviewed_times + 1 WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await pool.query(
      `DELETE FROM cards WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};
