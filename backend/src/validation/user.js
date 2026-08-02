// Zod schema for PATCH /api/user.
//
// `userService.ALLOWED_UPDATES` already filtered which COLUMNS a client can
// write; nothing checked the VALUES. Consequences that this closes:
//   - `email` took any string of any length, with no format check. Since
//     `users_email_lower_idx` is UNIQUE, a duplicate threw 23505 and surfaced
//     as a 500 — the route now maps it to 409.
//   - `avatar_index` took any value. A string hit the `smallint` column and
//     came back as 22P02 → 500; an out-of-range int as 22003 → 500.
//   - `display_name` / `language` were unbounded (the web client's
//     `maxLength={64}` is browser-side only).
//
// `.strict()` rejects unknown keys rather than silently dropping them, so a
// client that misspells a field gets told instead of watching the write
// vanish. The service-layer allowlist stays as defence in depth.

const { z } = require("zod");
const { TEXT, NUMBERS } = require("../config/limits");

const updatesSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, "display_name must not be empty")
      .max(TEXT.DISPLAY_NAME, `display_name must be at most ${TEXT.DISPLAY_NAME} characters`)
      .optional(),
    // Nullable so a user can clear the field. Zod's email check is a
    // pragmatic format check, not RFC 5322 — enough to reject the obviously
    // malformed without rejecting valid-but-unusual addresses.
    email: z
      .string()
      .trim()
      .max(TEXT.EMAIL, `email must be at most ${TEXT.EMAIL} characters`)
      .pipe(z.email("email must be a valid email address"))
      .nullable()
      .optional(),
    language: z
      .string()
      .trim()
      .min(1, "language must not be empty")
      .max(TEXT.LANGUAGE, `language must be at most ${TEXT.LANGUAGE} characters`)
      .optional(),
    avatar_index: z
      .number({ error: "avatar_index must be a number" })
      .int("avatar_index must be an integer")
      .min(0, "avatar_index must not be negative")
      .max(NUMBERS.AVATAR_INDEX_MAX, `avatar_index must be at most ${NUMBERS.AVATAR_INDEX_MAX}`)
      .optional(),
    onboarding_completed: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

const patchUserSchema = z.object({
  updates: updatesSchema,
});

module.exports = { patchUserSchema };
