/**
 * The strength meter's level, derived from the password alone.
 *
 * Levels 1–4 are the handoff's (WEAK · FAIR · STRONG · STRONG, all filled);
 * 0 is an empty field, which draws an empty meter and no label. The ladder is
 * pinned to the real policy in `AuthView.validate()` (mirroring
 * `backend/src/validation/auth.js`): anything the server would reject is
 * WEAK, the minimum it accepts is FAIR, and STRONG is earned by length or
 * variety on top of that — so the meter never says STRONG for a password the
 * submit will bounce, and never says WEAK for one it will take.
 */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

const CLASSES = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/];

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  const passesPolicy = password.length >= 8 && password.length <= 72 && /[^A-Za-z\s]/.test(password);
  if (!passesPolicy) return 1;
  const classes = CLASSES.filter((re) => re.test(password)).length;
  const long = password.length >= 12;
  if (long && classes >= 3) return 4;
  if (long || classes >= 3) return 3;
  return 2;
}
