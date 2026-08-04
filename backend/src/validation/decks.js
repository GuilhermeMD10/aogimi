// Zod schemas for /api/decks/* (decks + nested cards).
//
// Before these existed the routes checked `if (!name)` and `if (!front ||
// !back)` and passed everything else straight to the repository. That left
// three holes: unbounded text length (a 10 KB deck name, capped only by the
// JSON body limit), `state` accepting any string, and no way to tell a
// client which field it got wrong.

const { z } = require("zod");
const { TEXT, ARRAYS, NUMBERS, CARD_STATES } = require("../config/limits");
const { requiredText, optionalText } = require("./_helpers");

// ── Dictionary snapshot fields (migration 026) ──────────────────────────────
//
// Body keys are camelCase (`jlptLevel`) to match the existing `contextSentence`
// convention; the columns stay snake_case and the response therefore returns
// `jlpt_level`. Both schemas share these two so create and update can't drift.

// Deliberately `z.number()`, NOT `z.coerce.number()`: a body is JSON, so a
// well-behaved client sends the number 3. Coercion would quietly accept the
// string "3" and thereby hide a client bug that would show up the moment
// anything did arithmetic on the field.
//
// `.nullable()` because NULL is a legal value (unknown tier), `.optional()`
// because the write path is COALESCE — an absent field means "leave it alone".
// Note that null is therefore indistinguishable from absent on update: a PUT
// cannot clear a captured tier back to NULL.
const jlptLevelField = z
  .number({ error: "Card JLPT level must be a number" })
  .int("Card JLPT level must be a whole number")
  .min(NUMBERS.JLPT_LEVEL_MIN, `Card JLPT level must be between ${NUMBERS.JLPT_LEVEL_MIN} and ${NUMBERS.JLPT_LEVEL_MAX}`)
  .max(NUMBERS.JLPT_LEVEL_MAX, `Card JLPT level must be between ${NUMBERS.JLPT_LEVEL_MIN} and ${NUMBERS.JLPT_LEVEL_MAX}`)
  .nullable()
  .optional();

// Per-item `.min(1)` is a deliberate divergence from `optionalText`, which
// allows ''. In a scalar column '' is the documented way to say "no value";
// inside a 3-slot array it isn't — an empty gloss is a blank line the client
// has to filter out at render time. Reject it at the boundary instead. Send a
// shorter array (or `[]`) to mean "fewer meanings".
const meaningsField = z
  .array(
    z
      .string({ error: "Each card meaning must be a string" })
      .trim()
      .min(1, "Card meanings must not contain empty entries")
      .max(TEXT.CARD_MEANING, `Each card meaning must be at most ${TEXT.CARD_MEANING} characters`),
    { error: "Card meanings must be an array of strings" }
  )
  .max(ARRAYS.CARD_MEANINGS, `Card meanings must have at most ${ARRAYS.CARD_MEANINGS} entries`)
  .optional();

const createDeckSchema = z.object({
  name: requiredText("Deck name", TEXT.DECK_NAME),
  description: optionalText("Deck description", TEXT.DECK_DESCRIPTION),
});

// PUT is a partial update — the repository COALESCEs anything omitted, so an
// absent field means "leave it alone". At least one field must be present,
// otherwise the request is a no-op that still costs two queries.
const updateDeckSchema = z
  .object({
    name: requiredText("Deck name", TEXT.DECK_NAME).optional(),
    description: optionalText("Deck description", TEXT.DECK_DESCRIPTION),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: "Provide name and/or description",
  });

const createCardSchema = z.object({
  front: requiredText("Card front", TEXT.CARD_FRONT),
  back: requiredText("Card back", TEXT.CARD_BACK),
  reading: optionalText("Card reading", TEXT.CARD_READING),
  notes: optionalText("Card notes", TEXT.CARD_NOTES),
  contextSentence: optionalText("Card context", TEXT.CARD_CONTEXT),
  jlptLevel: jlptLevelField,
  meanings: meaningsField,
});

// `state` is accepted here because the client legitimately writes it when a
// card is edited, but it's constrained to the SRS ladder. Note that a client
// CAN still hand-set state via this route — that's a deliberate product
// decision (manual re-grading), not an oversight. What it can no longer do is
// write a value the rest of the system doesn't understand.
const updateCardSchema = z
  .object({
    front: requiredText("Card front", TEXT.CARD_FRONT).optional(),
    back: requiredText("Card back", TEXT.CARD_BACK).optional(),
    reading: optionalText("Card reading", TEXT.CARD_READING),
    notes: optionalText("Card notes", TEXT.CARD_NOTES),
    contextSentence: optionalText("Card context", TEXT.CARD_CONTEXT),
    state: z
      .enum(CARD_STATES, {
        error: `Card state must be one of ${CARD_STATES.join(", ")}`,
      })
      .optional(),
    // Accepted on update for completeness, but see the note on
    // `jlptLevelField`: because the repository COALESCEs, `{"jlptLevel": null}`
    // is a no-op rather than a clear. `meanings: []` DOES clear.
    jlptLevel: jlptLevelField,
    meanings: meaningsField,
  })
  // Still correct with the two new keys: zod omits absent optional keys from
  // the parsed object entirely, so `Object.values` only sees what was sent.
  // The one value that is present-but-undefined-looking is `jlptLevel: null`,
  // and `null !== undefined`, so a body of just that satisfies the refine
  // (it parses, then no-ops in SQL — a wasted write, not a broken one).
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update",
  });

const reviewCardSchema = z.object({
  outcome: z.enum(["again", "hard", "easy"], {
    error: "outcome must be 'again', 'hard', or 'easy'",
  }),
});

module.exports = {
  createDeckSchema,
  updateDeckSchema,
  createCardSchema,
  updateCardSchema,
  reviewCardSchema,
};
