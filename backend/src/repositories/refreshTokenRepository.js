const pool = require("../db");

// Server-side state for refresh-token rotation + revocation.
//
// The raw token is NEVER stored — only its SHA-256. On every /auth/refresh
// we look up by hash; on success we mark the row revoked and insert a new
// one. /auth/logout marks the active row revoked without issuing a new
// pair. A `revoked_at IS NOT NULL` check at lookup time is what makes
// rotation tamper-evident: replaying a previous refresh token fails.

module.exports = {
  insert: async ({ userId, tokenHash, expiresAt }) => {
    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, token_hash, expires_at`,
      [userId, tokenHash, expiresAt],
    );
    return result.rows[0];
  },

  /** Find a not-yet-revoked, not-expired row by its SHA-256 hash. Returns
   *  `null` for any lookup that should be treated as auth failure
   *  (missing, revoked, or expired). */
  findActiveByHash: async (tokenHash) => {
    const result = await pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > now()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  },

  /** Revoke one token by id. Idempotent: revoking an already-revoked row
   *  is a no-op. Used on /auth/refresh (old token) and /auth/logout. */
  revokeById: async (id) => {
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL",
      [id],
    );
  },

  /** Revoke every refresh token for a user. Called when a password
   *  changes — every active session needs to re-authenticate. */
  revokeAllForUser: async (userId) => {
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId],
    );
  },
};
