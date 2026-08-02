// Zod schemas for /api/decks/* (decks + nested cards).
//
// Before these existed the routes checked `if (!name)` and `if (!front ||
// !back)` and passed everything else straight to the repository. That left
// three holes: unbounded text length (a 10 KB deck name, capped only by the
// JSON body limit), `state` accepting any string, and no way to tell a
// client which field it got wrong.

const { z } = require("zod");
const { TEXT, CARD_STATES } = require("../config/limits");
const { requiredText, optionalText } = require("./_helpers");

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
  })
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
