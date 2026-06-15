// Zod schemas + password-strength check for the auth endpoints.
//
// Password rules follow NIST 2024 guidance:
//   - Min 8 chars (no upper cap beyond the bcrypt 72-byte truncation)
//   - All printable unicode allowed including spaces
//   - NO composition rules (mixed case / digits / symbols) — they
//     reduce entropy in practice as users dodge them with `Password1!`
//   - DO check against a common-password list via zxcvbn (score 0-4;
//     we reject < 2, which kills the top ~10k common passwords)

const { z } = require("zod");
const zxcvbn = require("zxcvbn");

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Username may contain letters, numbers, '_', '.', '-'");

// 72-byte cap matches bcrypt's silent truncation — refuse longer
// strings explicitly so two passwords that differ only past byte 72
// don't end up indistinguishable to bcrypt.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Run zxcvbn against the candidate password + the username (so common
 *  variants like "shirubeshirube" or "<username>123" get downscored).
 *  Returns the score (0-4) and a user-facing hint when too weak. */
function checkPasswordStrength(password, username) {
  const result = zxcvbn(password, username ? [username] : []);
  if (result.score < 2) {
    return {
      ok: false,
      reason:
        result.feedback?.warning ||
        result.feedback?.suggestions?.[0] ||
        "Password is too common or guessable",
    };
  }
  return { ok: true };
}

/** Express helper: validate body against schema, send 400 on failure,
 *  return parsed object on success. Returns null when validation
 *  failed and the response has already been written. */
function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: result.error.issues.map((i) => i.message).join(", ") });
    return null;
  }
  return result.data;
}

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  checkPasswordStrength,
  parseBody,
};
