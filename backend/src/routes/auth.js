// /api/auth/* — registration, login, refresh, logout.
//
// Per-endpoint rate limiters (tighter than the global limiter in
// app.js) are applied here so the auth surface specifically can't be
// brute-forced. Keys are IP-only on register/refresh/logout; login
// adds a username segment so a single bad actor can't lock out other
// users on the same NAT.

const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const authService = require("../services/authService");
const { registerSchema, loginSchema } = require("../validation/auth");
const { parseBody } = require("../validation/_helpers");
const {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  COOKIE_SAMESITE,
  COOKIE_SECURE,
  COOKIE_DOMAIN,
  REFRESH_TTL_MS,
} = require("../config/auth");

const router = Router();

// ── Refresh-token transport ────────────────────────────────────────────────
//
// Two transports for the refresh token, chosen per request:
//   - Browser clients (carry an Origin header) get the refresh token in an
//     httpOnly cookie. JS can't read it, so an XSS payload can't steal it.
//     The response body omits the refresh token entirely.
//   - Native clients (React Native fetch, curl — no Origin header) get the
//     refresh token in the JSON body, as before, and store it themselves
//     (expo-secure-store). Unchanged from the pre-cookie contract.
//
// A request is treated as a browser when it carries a non-empty Origin.

function isBrowserClient(req) {
  return typeof req.headers.origin === "string" && req.headers.origin.length > 0;
}

function refreshCookieOptions() {
  // SameSite=none mandates Secure; otherwise honour the configured flag.
  const sameSite = COOKIE_SAMESITE;
  const secure = sameSite === "none" ? true : COOKIE_SECURE;
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: REFRESH_COOKIE_PATH,
    domain: COOKIE_DOMAIN,
    maxAge: REFRESH_TTL_MS,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  // clearCookie must match the attributes the cookie was set with (path /
  // domain / sameSite / secure) or the browser ignores the deletion.
  const opts = refreshCookieOptions();
  delete opts.maxAge;
  res.clearCookie(REFRESH_COOKIE_NAME, opts);
}

function readRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken || null;
}

/** Shape the auth response per transport: cookie for browsers (token kept
 *  out of the JSON), body for native clients. */
function sendAuthSuccess(req, res, { user, accessToken, refreshToken }, status = 200) {
  if (isBrowserClient(req)) {
    setRefreshCookie(res, refreshToken);
    return res.status(status).json({ user, accessToken });
  }
  return res.status(status).json({ user, accessToken, refreshToken });
}

// ── Limiters ─────────────────────────────────────────────────────────────

// 5 attempts / 15 min per (IP + username). Returns 429 with the
// standard `RateLimit-*` headers so the client can back off.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // ipKeyGenerator normalises IPv6 properly (per express-rate-limit
  // guidance). Concatenating raw `req.ip` would let a v6 client bypass
  // by switching addresses inside its /64.
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.body?.username ?? ""}`,
  message: { error: "Too many login attempts. Try again later." },
});

// 5 registrations / 30 min per IP. Aggressive on purpose — a real user
// signs up once.
const registerLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-up attempts. Try again later." },
});

// ── Routes ───────────────────────────────────────────────────────────────

router.post("/register", registerLimiter, async (req, res) => {
  // Sign-ups are OPEN. This handler carried a `return res.status(403)` as its
  // first statement for a while; to close registration again, put that line
  // back rather than deleting anything below it.
  const body = parseBody(registerSchema, req, res);
  if (!body) return;

  try {
    const tokens = await authService.register(body.username, body.email, body.password);
    return sendAuthSuccess(req, res, tokens, 201);
  } catch (err) {
    // `code` rides along so the client can attach the message to the field
    // that caused it rather than to the form as a whole.
    if (err.code === "USERNAME_TAKEN" || err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    // Generic 500 — never echo internal messages on the auth surface.
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const body = parseBody(loginSchema, req, res);
  if (!body) return;

  try {
    const tokens = await authService.login(body.username, body.password);
    return sendAuthSuccess(req, res, tokens);
  } catch (err) {
    if (err.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/refresh", async (req, res) => {
  const browser = isBrowserClient(req);

  // CSRF guard for the cookie transport. The refresh cookie is attached
  // automatically by the browser, so a cross-site page could otherwise
  // trigger a rotation. SameSite=Lax already blocks the cookie on
  // cross-site requests; this rejects any browser refresh whose Origin
  // isn't on the allowlist as defence-in-depth (and covers a future
  // SameSite=None config). Reuses the exact CORS allowlist via app.locals.
  if (browser) {
    const isAllowedOrigin = req.app.locals.isAllowedOrigin;
    if (!isAllowedOrigin || !isAllowedOrigin(req.headers.origin)) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
  }

  const refreshToken = readRefreshToken(req);
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  try {
    const tokens = await authService.refresh(refreshToken);
    return sendAuthSuccess(req, res, tokens);
  } catch (err) {
    if (err.code === "INVALID_REFRESH" || err.code === "USER_GONE") {
      // Token is dead — clear the browser's stale cookie so it stops
      // resending it on every page load.
      if (browser) clearRefreshCookie(res);
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Refresh failed" });
  }
});

router.post("/logout", async (req, res) => {
  // Logout accepts a missing/bad token gracefully — the client just
  // wants confirmation it can drop local state. We still attempt to
  // revoke if a token is supplied so a thief can't keep using it.
  const refreshToken = readRefreshToken(req);
  try {
    await authService.logout(refreshToken);
  } catch {
    /* best effort */
  }
  if (isBrowserClient(req)) clearRefreshCookie(res);
  return res.json({ ok: true });
});

module.exports = router;
