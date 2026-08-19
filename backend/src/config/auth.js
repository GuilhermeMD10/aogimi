// Centralised auth constants. Everything that's sensitive comes from
// environment variables; everything else is in this file so the rest
// of the codebase can `require` it without scattering literals around.

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

  // ── Refresh-token cookie (web transport) ────────────────────────────────
  //
  // Browser clients carry the refresh token in an httpOnly cookie so it is
  // unreadable from JS (XSS can't exfiltrate it). Native clients (no Origin
  // header) keep using the JSON-body transport — see src/routes/auth.js.
  //
  // Deployment is same-site: web at aogimi.com / www.aogimi.com, API at
  // api.aogimi.com (shared registrable domain). That makes SameSite=Lax
  // sufficient — the cookie is sent on the cross-origin-but-same-site
  // refresh call — and lets the cookie stay host-only (no Domain), so it is
  // never shared with other subdomains.
  // COOKIE_SAMESITE=none, which forces Secure on).
  REFRESH_COOKIE_NAME: "aogimi_refresh",
  REFRESH_COOKIE_PATH: "/api/auth",
  COOKIE_SAMESITE: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
  COOKIE_SECURE:
    process.env.COOKIE_SECURE != null
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
};
