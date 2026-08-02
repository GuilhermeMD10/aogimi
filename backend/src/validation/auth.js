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
const { TEXT } = require("../config/limits");

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

// Collected at sign-up as of the auth redesign. The column has been on
// `users` (nullable) since 001 and is still nullable in the DB: accounts
// created before this change have no address, and a NOT NULL migration would
// need a backfill that has nothing to backfill from. So the requirement lives
// at this boundary — every NEW account has an email, existing ones keep their
// NULL. Format checking mirrors `validation/user.js` (a pragmatic check, not
// RFC 5322) and `users_email_lower_idx` enforces uniqueness case-insensitively.
const emailSchema = z
  .string()
  .trim()
  .max(TEXT.EMAIL, `Email must be at most ${TEXT.EMAIL} characters`)
  .pipe(z.email("Enter a valid email address"));

const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};
