// One row per (user, calendar date) the user studied at least one
// card. Drives the days-studied counter and the heatmap so we don't
// aggregate `card_reviews` on every render.
//
// Date bucketing is server-local for now (UTC by default). Timezone-
// aware bucketing is a polish item; revisit if a user is in UTC-12 and
// their "today" looks shifted in the heatmap.

const pool = require("../db");

module.exports = {
  bumpForToday: async (userId, now = new Date()) => {
    const studiedOn = now.toISOString().slice(0, 10); // YYYY-MM-DD
    await pool.query(
      `INSERT INTO study_days (user_id, studied_on, review_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, studied_on)
       DO UPDATE SET review_count = study_days.review_count + 1`,
      [userId, studiedOn],
    );
  },
};
