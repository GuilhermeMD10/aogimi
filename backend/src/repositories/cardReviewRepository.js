// Append-only event log for SRS reviews. Every POST to
// /api/decks/cards/:cardId/review writes one row here.
//
// Every function takes an optional trailing `db` — the pool by default, or a
// checked-out client when the caller is inside a transaction (the re-fold in
// `cardService` rewrites several rows and the card together).

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
    clientReviewId = null,
  }, db = pool) => {
    const result = await db.query(
      `INSERT INTO card_reviews
         (card_id, user_id, reviewed_at, outcome,
          difficulty_before, difficulty_after,
          stability_before, stability_after,
          state_before, state_after,
          elapsed_days, client_review_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        clientReviewId,
      ],
    );
    return result.rows[0];
  },

  /** The review a client already sent under this id, or undefined. */
  findByClientId: async (clientReviewId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM card_reviews WHERE client_review_id = $1`,
      [clientReviewId],
    );
    return result.rows[0];
  },

  /** A card's whole log, oldest first — the input to a re-fold. Ties on
   *  `reviewed_at` break on insertion order. */
  listByCard: async (cardId, db = pool) => {
    const result = await db.query(
      `SELECT * FROM card_reviews WHERE card_id = $1 ORDER BY reviewed_at, id`,
      [cardId],
    );
    return result.rows;
  },

  /** Rewrite one event's memory-state snapshot after a re-fold changed what
   *  came before it. `reviewed_at`, `outcome` and identity never change. */
  rewriteSnapshot: async (id, {
    difficultyBefore,
    difficultyAfter,
    stabilityBefore,
    stabilityAfter,
    stateBefore,
    stateAfter,
    elapsedDays,
  }, db = pool) => {
    await db.query(
      `UPDATE card_reviews
          SET difficulty_before = $2, difficulty_after = $3,
              stability_before  = $4, stability_after  = $5,
              state_before      = $6, state_after      = $7,
              elapsed_days      = $8
        WHERE id = $1`,
      [id, difficultyBefore, difficultyAfter, stabilityBefore, stabilityAfter, stateBefore, stateAfter, elapsedDays],
    );
  },

  /** Drop an event a re-fold found was not due when it happened — the same
   *  outcome a live not-due grade has (no row at all). */
  remove: async (id, db = pool) => {
    await db.query(`DELETE FROM card_reviews WHERE id = $1`, [id]);
  },
};
