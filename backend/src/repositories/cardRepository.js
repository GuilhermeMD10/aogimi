const pool = require("../db");

// What "due" means, in one place. Five queries below need it (per-deck list,
// all-decks list, random pick, per-deck count, per-deck counts) and they must
// agree — a card is due when it has never been reviewed, or when its scheduled
// review time has passed. Static SQL fragment, never user input.
const DUE = "(next_due_at IS NULL OR next_due_at <= now())";

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

  /** Total cards in a deck, due or not. Backs the per-deck card quota.
   *  Distinct from `countDueByDeck`, which applies the DUE predicate. */
  countByDeck: async (deckId) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM cards WHERE deck_id = $1`,
      [deckId]
    );
    return result.rows[0]?.count ?? 0;
  },

  findByDeck: async (deckId) => {
    const result = await pool.query(
      `SELECT * FROM cards WHERE deck_id = $1 ORDER BY created_at DESC`,
      [deckId]
    );
    return result.rows;
  },

  findByDeckIds: async (deckIds) => {
    if (!deckIds || deckIds.length === 0) return [];
    const result = await pool.query(
      `SELECT * FROM cards WHERE deck_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
      [deckIds]
    );
    return result.rows;
  },

  // Cards due for review in a single deck. Most-overdue first; never-reviewed
  // cards sort ahead of everything (NULLS FIRST).
  findDueByDeck: async (deckId) => {
    const result = await pool.query(
      `SELECT * FROM cards
        WHERE deck_id = $1
          AND ${DUE}
        ORDER BY next_due_at ASC NULLS FIRST`,
      [deckId]
    );
    return result.rows;
  },

  // Same predicate, pooled across many decks (used for the all-decks due
  // queue). Empty input → empty result, no query.
  findDueByDeckIds: async (deckIds) => {
    if (!deckIds || deckIds.length === 0) return [];
    const result = await pool.query(
      `SELECT * FROM cards
        WHERE deck_id = ANY($1::uuid[])
          AND ${DUE}
        ORDER BY next_due_at ASC NULLS FIRST`,
      [deckIds]
    );
    return result.rows;
  },

  // How many cards are due in one deck. Counts in SQL rather than measuring
  // findDueByDeck().length, so a badge doesn't pull whole card rows over the
  // wire to arrive at one integer.
  countDueByDeck: async (deckId) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM cards
        WHERE deck_id = $1
          AND ${DUE}`,
      [deckId]
    );
    return result.rows[0]?.count ?? 0;
  },

  // Due counts for many decks in one round trip. Decks with nothing due are
  // absent from the result rather than present with 0 — GROUP BY only emits
  // groups that exist, and the caller treats "missing" as zero.
  countDueByDeckIds: async (deckIds) => {
    if (!deckIds || deckIds.length === 0) return [];
    const result = await pool.query(
      `SELECT deck_id, COUNT(*)::int AS count
         FROM cards
        WHERE deck_id = ANY($1::uuid[])
          AND ${DUE}
        GROUP BY deck_id`,
      [deckIds]
    );
    return result.rows;
  },

  // One card picked at random out of the due pool across many decks. Used by
  // the single-card "study something now" entry point, so ordering is
  // irrelevant — only the pick matters. `ORDER BY random()` sorts the whole
  // due set, which is fine at the deck sizes we expect (same assumption
  // studyService makes when it orders sessions in JS). Returns undefined when
  // nothing is due.
  findRandomDueByDeckIds: async (deckIds) => {
    if (!deckIds || deckIds.length === 0) return undefined;
    const result = await pool.query(
      `SELECT * FROM cards
        WHERE deck_id = ANY($1::uuid[])
          AND ${DUE}
        ORDER BY random()
        LIMIT 1`,
      [deckIds]
    );
    return result.rows[0];
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

  applySrsUpdate: async (id, next) => {
    // Writes the post-outcome SRS fields. `reviewed_times` is bumped in
    // the same UPDATE so the legacy column stays consistent with the
    // event log.
    const result = await pool.query(
      `UPDATE cards
          SET difficulty       = $2,
              stability        = $3,
              last_outcomes    = $4,
              last_reviewed_at = $5,
              state            = $6,
              next_due_at      = $7,
              reviewed_times   = reviewed_times + 1
        WHERE id = $1
        RETURNING *`,
      [
        id,
        next.difficulty,
        next.stability,
        next.last_outcomes,
        next.last_reviewed_at,
        next.state,
        next.next_due_at,
      ],
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
