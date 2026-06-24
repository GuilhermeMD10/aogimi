// Zod schemas for the auth endpoints.
//
// Password policy:
//   - Min 8 characters
//   - At least one non-letter (digit OR symbol) — single composition
//     rule, kept simple on purpose.
//   - Silently capped at 72 bytes (bcrypt truncation limit). Two
//     passwords that differ only past byte 72 would be indistinguishable
//     to bcrypt, so we reject longer strings outright instead of letting
//     them through silently.

const { z } = require("zod");

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Username may contain letters, numbers, '_', '.', '-'");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  // At least one character that's neither a letter nor whitespace —
  // satisfied by any digit (0-9) or symbol (!@#$ etc.). Spaces alone
  // don't qualify.
  .regex(/[^A-Za-z\s]/, "Password must contain at least one number or symbol");

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
  parseBody,
};
