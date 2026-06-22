const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const wordsRouter     = require("./routes/words");
const kanjiRouter     = require("./routes/kanji");
const namesRouter     = require("./routes/names");
const searchRouter    = require("./routes/search");
const translateRouter = require("./routes/translate");
const authRouter      = require("./routes/auth");
const userRouter      = require("./routes/user");
const booksRouter     = require("./routes/books");
const decksRouter     = require("./routes/decks");
const devicesRouter   = require("./routes/devices");
const studyRouter     = require("./routes/study");
const statsRouter     = require("./routes/stats");
const { authenticateJWT } = require("./middleware/authenticateJWT");
const { requestLogger } = require("./middleware/requestLogger");

const app = express();

// Behind Render / Vercel / Cloudflare etc. — without this, `req.secure`
// is always false and `req.ip` is the proxy's IP (which would break the
// per-IP rate limiter). One hop matches the typical PaaS setup; bump
// if we ever sit behind a chain of proxies.
app.set("trust proxy", 1);

// Per-request logger. Mounted before everything so CORS rejections,
// rate-limit 429s, and 401s all show up in the log alongside the
// normal traffic. Logs the request line only — never bodies, never
// headers, never the Authorization token.
app.use(requestLogger);

// Force HTTPS in production. TLS termination happens at the platform
// edge so all we do is bounce any request that arrived plaintext.
// `x-forwarded-proto` is the canonical signal behind a reverse proxy.
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    if (req.secure || proto === "https") return next();
    return res.redirect(308, `https://${req.headers.host}${req.url}`);
  });
}

// Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
app.use(helmet());

// JSON body parsing with a 10 KB cap. Auth payloads are tiny; anything
// bigger is either a bug or a DoS attempt.
app.use(express.json({ limit: "10kb" }));

// Explicit origin allowlist. Dev defaults cover the Next.js ports;
// production sets CORS_ORIGIN to the deployed web origin. RN fetch
// sends no Origin header, so the mobile app is unaffected by CORS.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3001,http://localhost:3002")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // No origin = same-origin / curl / native app → allow.
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Accept", "Content-Type", "Authorization"],
    credentials: false,
  }),
);

// Global API limiter — catches naive abuse. Per-endpoint limiters for
// auth (login / register / forgot-password) are wired inside the
// individual routers so they can use tighter windows and key by
// IP + email/username combos.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
app.use("/api", globalLimiter);

// ── Public routes ───────────────────────────────────────────────────────────
// Dictionary endpoints don't need auth — they're shared across all
// users and contain no PII. Auth itself is also public (the endpoints
// here ARE how you authenticate). Per-endpoint rate limiters live
// inside the auth router so /login can be tighter than /search.
app.use("/api/auth",      authRouter);
app.use("/api/search",    searchRouter);
app.use("/api/words",     wordsRouter);
app.use("/api/kanji",     kanjiRouter);
app.use("/api/names",     namesRouter);
app.use("/api/translate", translateRouter);

// ── Protected routes ────────────────────────────────────────────────────────
// Everything below requires a valid access token. `authenticateJWT`
// attaches `req.user = { userId, username }`; routes use that as the
// only source of identity (body `userId`s are ignored).
app.use("/api/user",    authenticateJWT, userRouter);
app.use("/api/books",   authenticateJWT, booksRouter);
app.use("/api/decks",   authenticateJWT, decksRouter);
app.use("/api/devices", authenticateJWT, devicesRouter);
app.use("/api/study",   authenticateJWT, studyRouter);
app.use("/api/stats",   authenticateJWT, statsRouter);

module.exports = app;
