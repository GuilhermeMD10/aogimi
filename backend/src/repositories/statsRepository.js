// Aggregations for the global stats screen. Read-only; never writes.

const pool = require("../db");

const HEATMAP_DAYS = 365;
const HARDEST_LIST_LIMIT = 20;

module.exports = {
  /**
   * Per-day review counts over the last 365 days. Only returns days
   * with at least one review.
   */
  perDayReviewCounts: async (userId) => {
    const result = await pool.query(
      `SELECT studied_on::text AS date, review_count AS count
         FROM study_days
        WHERE user_id = $1
          AND studied_on >= (current_date - INTERVAL '1 day' * $2)
        ORDER BY studied_on ASC`,
      [userId, HEATMAP_DAYS]
    );
    return result.rows;
  },

  daysStudiedTotal: async (userId) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS days_studied FROM study_days WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.days_studied ?? 0;
  },

  /**
   * Card count per SRS state for this user. Returns all four buckets
   * even when zero so the client doesn't have to backfill.
   */
  cardCountsByState: async (userId) => {
    const result = await pool.query(
      `SELECT c.state, COUNT(*)::int AS count
         FROM cards c
         JOIN decks d ON d.id = c.deck_id
        WHERE d.user_id = $1
        GROUP BY c.state`,
      [userId]
    );
    const buckets = { new: 0, seen: 0, learned: 0, mastered: 0 };
    for (const row of result.rows) {
      if (row.state in buckets) buckets[row.state] = row.count;
    }
    return buckets;
  },

  /**
   * Top N hardest cards. Sorted by difficulty desc, then by recent
   * Again count (we approximate with the encoded last_outcomes string).
   */
  hardestCards: async (userId) => {
    const result = await pool.query(
      `SELECT c.*
         FROM cards c
         JOIN decks d ON d.id = c.deck_id
        WHERE d.user_id = $1
          AND c.state <> 'new'
        ORDER BY c.difficulty DESC,
                 -- count of 'A' chars in last_outcomes as a tiebreaker
                 (length(c.last_outcomes) - length(replace(c.last_outcomes, 'A', ''))) DESC,
                 c.created_at DESC
        LIMIT $2`,
      [userId, HARDEST_LIST_LIMIT]
    );
    return result.rows;
  },
};
