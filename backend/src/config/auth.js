// Centralised auth constants. Everything that's sensitive comes from
// environment variables; everything else is in this file so the rest
// of the codebase can `require` it without scattering literals around.
//
// Fail-fast on missing secrets: there's no safe default for a JWT
// signing key, so the server refuses to start without one. This is
// loud on purpose — silently signing with "dev-secret" in production
// is the kind of bug you only find after it's already shipped.

function requireEnv(name) {
  const v = process.env[name];
  if (!v || v.length < 32) {
    throw new Error(
      `[auth/config] ${name} is missing or too short (need ≥ 32 chars). ` +
        `Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
    );
  }
  return v;
}

module.exports = {
  /** bcrypt salt rounds. 12 ≈ ~250ms/hash on a 2024 cloud VM — slow enough
   *  to make brute force costly, fast enough to feel instant to the user. */
  SALT_ROUNDS: 12,

  /** HS256 secrets — separate keys so a leak of one doesn't compromise
   *  both. Required in any environment that issues tokens; tests can stub
   *  these via the same env vars. */
  ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),

  /** Lifetimes. Short access token + long refresh token is the standard
   *  pattern: a stolen access token expires fast; a stolen refresh token
   *  can be revoked server-side via the `refresh_tokens.revoked_at`
   *  column on the next /auth/refresh round-trip. */
  ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRY || "15m",
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRY || "30d",

  /** Absolute refresh-token lifetime in ms. Used to compute the DB
   *  `expires_at` row at insert time. Mirrors `REFRESH_EXPIRES_IN`
   *  above and must stay in sync with it. */
  REFRESH_TTL_MS: 30 * 24 * 60 * 60 * 1000,
};
