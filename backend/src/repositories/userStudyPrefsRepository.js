// Per-user display + filter preferences for study. One row per user;
// created lazily on first PUT. The shapes are documented in
// `migrations/022_card_srs.sql` and `SCHEMA.md`.

const pool = require("../db");

module.exports = {
  findByUser: async (userId) => {
    const result = await pool.query(
      `SELECT * FROM user_study_prefs WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  upsert: async (userId, { display, deckOverrides }) => {
    // Replace-on-PUT semantics: the client sends the full document and
    // we store it verbatim. The DB defaults only fire on row creation
    // when a field is omitted, so we pass null and let COALESCE keep
    // existing values on partial updates.
    const result = await pool.query(
      `INSERT INTO user_study_prefs (user_id, display, deck_overrides, updated_at)
       VALUES ($1,
               COALESCE($2::jsonb, '{"preset":"default","front":{"reading":false,"context":true,"jlpt":true,"deckName":true},"back":{"exampleSentence":true}}'::jsonb),
               COALESCE($3::jsonb, '{}'::jsonb),
               now())
       ON CONFLICT (user_id) DO UPDATE
         SET display        = COALESCE($2::jsonb, user_study_prefs.display),
             deck_overrides = COALESCE($3::jsonb, user_study_prefs.deck_overrides),
             updated_at     = now()
       RETURNING *`,
      [
        userId,
        display === undefined ? null : JSON.stringify(display),
        deckOverrides === undefined ? null : JSON.stringify(deckOverrides),
      ]
    );
    return result.rows[0];
  },
};
