const pool = require("../db");

// Public-facing column list used by every route that returns a profile.
// `password_hash` is deliberately excluded — no API response should ever
// carry it. New columns added to `users` should be added here only if
// they are safe to expose to clients.
const PUBLIC_COLUMNS = "id, username, display_name, email, language, avatar_index, onboarding_completed, created_at";

module.exports = {
  /** Insert a new user with an already-bcrypted hash. The caller (auth
   *  service) owns hashing — this repo never sees a plaintext password. */
  create: async ({ username, passwordHash }) => {
    const result = await pool.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING ${PUBLIC_COLUMNS}`,
      [username, passwordHash],
    );
    return result.rows[0];
  },

  /** Find by id, return only public columns. */
  findById: async (id) => {
    const result = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  },

  existsById: async (id) => {
    const result = await pool.query(
      "SELECT 1 FROM users WHERE id = $1 LIMIT 1",
      [id],
    );
    return result.rowCount > 0;
  },

  /** Fetch the user record with `password_hash` for the login flow.
   *  ONLY callable from `authService.login`; never returned to clients.
   *  The hash is required so bcrypt.compare can verify the plaintext
   *  password without trusting the network. */
  findWithHashByUsername: async (username) => {
    const result = await pool.query(
      `SELECT id, username, password_hash FROM users WHERE username = $1`,
      [username],
    );
    return result.rows[0];
  },

  /** Patch arbitrary profile columns. `updates` is a partial map of
   *  column → value; the caller is responsible for filtering it to the
   *  allow-list of mutable columns (done at the service layer).
   *
   *  `updated_at` is bumped automatically so audit / sync flows can
   *  rely on it without callers remembering to set it. */
  updateById: async (id, updates) => {
    const setClauses = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(updates)) {
      // Defence-in-depth: `key` is interpolated as a SQL identifier, so it
      // must never carry attacker-controlled punctuation. The service layer
      // already filters to an allow-list; this guard means a future caller
      // that forgets to can't turn this into SQL injection. A real column
      // name always matches; anything with a space/quote/comma/paren can't.
      if (!/^[a-z_][a-z0-9_]*$/.test(key)) {
        throw new Error(`Illegal column name in update: ${key}`);
      }
      setClauses.push(`${key} = $${i}`);
      values.push(value);
      i++;
    }
    setClauses.push(`updated_at = now()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING ${PUBLIC_COLUMNS}`,
      values,
    );
    return result.rows[0];
  },

  /** Delete by id. Cascades to all user-data tables via FK. */
  deleteById: async (id) => {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    return result.rowCount > 0;
  },

  setOnboardingCompleted: async (userId, completed) => {
    await pool.query(
      "UPDATE users SET onboarding_completed = $2, updated_at = now() WHERE id = $1",
      [userId, completed],
    );
  },
};
