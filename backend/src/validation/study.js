// Zod schemas for /api/study/*.
//
// The session route already validated `scope`, `mode` and `dueOnly`; what it
// didn't bound was `limit` (any magnitude) or `deckIds` (any length).
//
// `PUT /api/study/prefs` had no validation at all — both JSONB documents were
// stringified and stored verbatim, so the column was writable as arbitrary
// user storage up to the 10 KB body cap.

const { z } = require("zod");
const { ARRAYS, LIMITS, QUOTAS } = require("../config/limits");
const { VALID_MODES } = require("../services/studyService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const deckIdSchema = z
  .string()
  .regex(UUID_RE, "deckIds must be uuids");

const sessionSchema = z
  .object({
    scope: z.enum(["all", "deck"], { error: "scope must be 'all' or 'deck'" }),
    mode: z.enum(VALID_MODES, {
      error: `mode must be one of ${VALID_MODES.join(", ")}`,
    }),
    deckIds: z
      .array(deckIdSchema)
      .max(
        ARRAYS.SESSION_DECK_IDS,
        `deckIds must have at most ${ARRAYS.SESSION_DECK_IDS} entries`,
      )
      .optional(),
    // Clamped rather than rejected so an over-large request still returns a
    // usable session. The ceiling matters because fetchSessionCards loads
    // every card in scope into memory before ordering.
    limit: z
      .number()
      .int("limit must be an integer")
      .min(1, "limit must be at least 1")
      .max(LIMITS.STUDY_SESSION, `limit must be at most ${LIMITS.STUDY_SESSION}`)
      .optional(),
    dueOnly: z.boolean({ error: "dueOnly must be a boolean" }).optional(),
  })
  .refine(
    (v) => v.scope !== "deck" || (Array.isArray(v.deckIds) && v.deckIds.length > 0),
    { message: "deckIds required when scope is 'deck'" },
  );

// `display` stays structurally open — SCHEMA.md documents this column as
// "JSONB keeps future toggles schema-free", and the web client already sends
// a slightly different front-toggle set than the backend default. What's
// enforced is that it's an object of booleans/short strings rather than an
// arbitrary blob: nested one level, bounded key count, no giant values.
const toggleGroup = z.record(z.string().max(64), z.boolean()).optional();

const displaySchema = z
  .object({
    preset: z.string().trim().max(32, "preset must be at most 32 characters").optional(),
    front: toggleGroup,
    back: toggleGroup,
  })
  .strict();

// One entry per deck the user owns, keyed by deck uuid. Bounded by the deck
// quota so this can't outgrow the thing it describes.
const deckOverridesSchema = z
  .record(
    deckIdSchema,
    z
      .object({
        mode: z.enum(VALID_MODES, {
          error: `mode must be one of ${VALID_MODES.join(", ")}`,
        }),
        sessionSize: z
          .number()
          .int("sessionSize must be an integer")
          .min(1, "sessionSize must be at least 1")
          .max(LIMITS.STUDY_SESSION, `sessionSize must be at most ${LIMITS.STUDY_SESSION}`),
      })
      .strict(),
  )
  .refine((v) => Object.keys(v).length <= QUOTAS.DECKS_PER_USER, {
    message: `deckOverrides must have at most ${QUOTAS.DECKS_PER_USER} entries`,
  });

const prefsSchema = z
  .object({
    display: displaySchema.optional(),
    deckOverrides: deckOverridesSchema.optional(),
  })
  .refine((v) => v.display !== undefined || v.deckOverrides !== undefined, {
    message: "Provide display and/or deckOverrides",
  });

module.exports = { sessionSchema, prefsSchema };
