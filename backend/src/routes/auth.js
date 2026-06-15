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
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  checkPasswordStrength,
  parseBody,
} = require("../validation/auth");

const router = Router();

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

// 3 registrations / hour per IP. Aggressive on purpose — a real user
// signs up once.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-up attempts. Try again later." },
});

// ── Routes ───────────────────────────────────────────────────────────────

router.post("/register", registerLimiter, async (req, res) => {
  const body = parseBody(registerSchema, req, res);
  if (!body) return;

  // zxcvbn lives outside zod because it needs the username for context.
  const strength = checkPasswordStrength(body.password, body.username);
  if (!strength.ok) return res.status(400).json({ error: strength.reason });

  try {
    const { user, accessToken, refreshToken } = await authService.register(
      body.username,
      body.password,
    );
    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.code === "USERNAME_TAKEN") {
      return res.status(409).json({ error: err.message });
    }
    // Generic 500 — never echo internal messages on the auth surface.
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const body = parseBody(loginSchema, req, res);
  if (!body) return;

  try {
    const { user, accessToken, refreshToken } = await authService.login(
      body.username,
      body.password,
    );
    return res.json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/refresh", async (req, res) => {
  const body = parseBody(refreshSchema, req, res);
  if (!body) return;

  try {
    const result = await authService.refresh(body.refreshToken);
    return res.json(result);
  } catch (err) {
    if (err.code === "INVALID_REFRESH" || err.code === "USER_GONE") {
      return res.status(401).json({ error: err.message });
    }
    return res.status(500).json({ error: "Refresh failed" });
  }
});

router.post("/logout", async (req, res) => {
  // Logout accepts a missing/bad token gracefully — the client just
  // wants confirmation it can drop local state. We still attempt to
  // revoke if a token is supplied so a thief can't keep using it.
  const refreshToken = req.body?.refreshToken;
  try {
    await authService.logout(refreshToken);
  } catch {
    /* best effort */
  }
  return res.json({ ok: true });
});

module.exports = router;
