// Append-only event log for SRS reviews. Every POST to
// /api/decks/cards/:cardId/review writes one row here.

const pool = require("../db");

module.exports = {
  create: async ({
    cardId,
    userId,
    reviewedAt,
    outcome,
    difficultyBefore,
    difficultyAfter,
    stabilityBefore,
    stabilityAfter,
    stateBefore,
    stateAfter,
    elapsedDays,
  }) => {
    const result = await pool.query(
      `INSERT INTO card_reviews
         (card_id, user_id, reviewed_at, outcome,
          difficulty_before, difficulty_after,
          stability_before, stability_after,
          state_before, state_after,
          elapsed_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        cardId,
        userId,
        reviewedAt,
        outcome,
        difficultyBefore,
        difficultyAfter,
        stabilityBefore,
        stabilityAfter,
        stateBefore,
        stateAfter,
        elapsedDays,
      ],
    );
    return result.rows[0];
  },
};
