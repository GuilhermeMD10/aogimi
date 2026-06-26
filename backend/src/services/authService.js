// Auth flows: register, login, refresh-token rotation, logout.
//
// Token model:
//   - Access token: HS256, 15 min, claims = { userId, username }.
//     Sent on every API call as `Authorization: Bearer <jwt>`.
//   - Refresh token: HS256, 30 days, claims = { userId, tokenId }.
//     Stored in the client (mobile: expo-secure-store; web: TBD). The
//     server stores the SHA-256 hash of every issued refresh token in
//     `refresh_tokens` so it can revoke one (logout) or all (password
//     change) without trusting the client to forget.
//
// Why both: an access-only model needs every protected request to do
// a DB round-trip to check session validity, which kills latency.
// A refresh-token model lets the access token be self-validating (no
// DB hit) while keeping the ability to revoke server-side via the
// refresh layer. The rotation step on every refresh makes a stolen
// refresh token detectable: an attacker who uses the leaked token
// invalidates the legitimate user's session on the next refresh.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const userRepo = require("../repositories/userRepository");
const refreshTokenRepo = require("../repositories/refreshTokenRepository");
const {
  SALT_ROUNDS,
  ACCESS_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  REFRESH_TTL_MS,
} = require("../config/auth");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN },
  );
}

/** Mint a refresh token AND persist its hash. Returns the raw token to
 *  hand to the client and the DB row id we just inserted (used during
 *  rotation to know which old row to revoke). */
async function issueRefreshToken(userId) {
  // Generate a server-side opaque id BEFORE signing so the JWT claim
  // and the DB row reference each other. tokenId is what /auth/refresh
  // uses to look up the row without needing the hash twice.
  const tokenId = crypto.randomUUID();
  const refreshToken = jwt.sign({ userId, tokenId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
  const tokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const row = await refreshTokenRepo.insert({ userId, tokenHash, expiresAt });
  return { refreshToken, row };
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const { refreshToken } = await issueRefreshToken(user.id);
  return { accessToken, refreshToken };
}

// ── Public API ──────────────────────────────────────────────────────────────

async function register(username, password) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user;
  try {
    user = await userRepo.create({ username, passwordHash });
  } catch (err) {
    // Unique-violation on username — surface as 409 from the route.
    if (err.code === "23505") {
      const e = new Error("Username already taken");
      e.code = "USERNAME_TAKEN";
      throw e;
    }
    throw err;
  }
  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

async function login(username, password) {
  // Always run bcrypt.compare even on missing-user — equalises timing
  // so an attacker can't enumerate existing usernames by latency.
  const row = await userRepo.findWithHashByUsername(username);
  const dummyHash = "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid.";
  const ok = await bcrypt.compare(password, row?.password_hash ?? dummyHash);
  if (!row || !ok) {
    const e = new Error("Invalid username or password");
    e.code = "INVALID_CREDENTIALS";
    throw e;
  }
  // Re-fetch via findById so the response carries the full public
  // profile shape (display_name, language, etc.) — the login row only
  // selected the auth-critical columns.
  const user = await userRepo.findById(row.id);
  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

/** Rotate refresh tokens. Verifies the signature, looks up the DB row,
 *  ensures it's not expired/revoked, revokes it, then issues a fresh
 *  pair. Returns the new pair. Throws on any failure path with a
 *  uniform error so the route layer doesn't have to discriminate. */
async function refresh(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") {
    const e = new Error("Invalid refresh token");
    e.code = "INVALID_REFRESH";
    throw e;
  }
  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ["HS256"] });
  } catch {
    const e = new Error("Invalid refresh token");
    e.code = "INVALID_REFRESH";
    throw e;
  }
  const tokenHash = sha256(refreshToken);
  const row = await refreshTokenRepo.findActiveByHash(tokenHash);
  if (!row || row.user_id !== payload.userId) {
    const e = new Error("Invalid refresh token");
    e.code = "INVALID_REFRESH";
    throw e;
  }
  // Rotate: revoke the old row, mint a new pair.
  await refreshTokenRepo.revokeById(row.id);
  const user = await userRepo.findById(payload.userId);
  if (!user) {
    const e = new Error("User no longer exists");
    e.code = "USER_GONE";
    throw e;
  }
  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

/** Mark a refresh token as revoked. Idempotent — calling /auth/logout
 *  twice in a row is fine. Best-effort: a bad or expired refresh token
 *  resolves successfully (the client doesn't need to know its token
 *  was already useless). */
async function logout(refreshToken) {
  if (!refreshToken || typeof refreshToken !== "string") return;
  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ["HS256"] });
  } catch {
    return;
  }
  const tokenHash = sha256(refreshToken);
  const row = await refreshTokenRepo.findActiveByHash(tokenHash);
  if (row && row.user_id === payload.userId) {
    await refreshTokenRepo.revokeById(row.id);
  }
}

/** Revoke EVERY active refresh token for a user. Called from password-
 *  change paths (and, eventually, password-reset) to force re-login on
 *  every device. */
async function revokeAllSessions(userId) {
  await refreshTokenRepo.revokeAllForUser(userId);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  revokeAllSessions,
};
