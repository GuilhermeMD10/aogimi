const pool = require("../db");

// What "due" means, in one place. Every due query below needs it and they
// must agree — a card is due when it has never been reviewed, or when its
// scheduled review time has passed. Static SQL fragment, never user input.
// Mirrored in JS by `cardSrsService.isDue`.
const DUE = "(next_due_at IS NULL OR next_due_at <= now())";

module.exports = {
  create: async ({ deckId, front, reading, back, notes, contextSentence, jlptLevel, meanings }) => {
    const result = await pool.query(
      `INSERT INTO cards (deck_id, front, reading, back, notes, context_sentence, jlpt_level, meanings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      // `jlpt_level` is nullable, so an absent value passes through as null
      // (unknown tier) rather than falling back to a number. `meanings` is
      // NOT NULL, so absent becomes the empty array — `??` not `||`, since
      // `[]` is truthy and `||` would silently keep a caller's empty array
      // for the wrong reason.
      [deckId, front, reading || "", back, notes || "", contextSentence || "", jlptLevel ?? null, meanings ?? []]
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

  // The due predicate, pooled across many decks — the session builder's input.
  // Empty input → empty result, no query.
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

  findById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM cards WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Partial update: null means "leave it alone" for every field, including the
  // two nullable-in-the-column ones. So a PUT cannot clear `jlpt_level` back to
  // NULL — that's the same COALESCE semantics every other card field has had,
  // and editing a card deliberately does not recompute its captured tier.
  // `meanings` IS clearable, by sending `[]` (an empty array is a value, not a
  // null).
  update: async (id, { front, reading, back, notes, state, contextSentence, jlptLevel, meanings }) => {
    const result = await pool.query(
      `UPDATE cards
       SET front            = COALESCE($2, front),
           reading          = COALESCE($3, reading),
           back             = COALESCE($4, back),
           notes            = COALESCE($5, notes),
           state            = COALESCE($6, state),
           context_sentence = COALESCE($7, context_sentence),
           jlpt_level       = COALESCE($8::smallint, jlpt_level),
           meanings         = COALESCE($9::text[], meanings)
       WHERE id = $1
       RETURNING *`,
      // The two casts are explicit because an untyped parameter inside
      // COALESCE() has to be resolved from the other branch; spelling the type
      // out keeps it independent of that inference.
      [id, front ?? null, reading ?? null, back ?? null, notes ?? null, state ?? null, contextSentence ?? null, jlptLevel ?? null, meanings ?? null]
    );
    return result.rows[0];
  },

  applySrsUpdate: async (id, next) => {
    // Writes the post-outcome SRS fields. `reviewed_times` is bumped in
    // the same UPDATE so the legacy column stays consistent with the
    // event log.
    //
    // `peak_rank` is written from the value the service computed rather than
    // with a SQL GREATEST: the ladder is ordered by position in an array, not
    // alphabetically, so Postgres has no comparison that means what we mean
    // ('met' > 'learned' > 'mastered' as text, which is the exact reverse).
    const result = await pool.query(
      `UPDATE cards
          SET difficulty       = $2,
              stability        = $3,
              last_outcomes    = $4,
              last_reviewed_at = $5,
              state            = $6,
              next_due_at      = $7,
              peak_rank        = $8,
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
        next.peak_rank,
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
