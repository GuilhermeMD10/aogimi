const pool = require("../db");

module.exports = {
  create: async ({ username, password }) => {
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
      [username, password]
    );
    return result.rows[0];
  },
  findById: async (id) => {
    const result = await pool.query(
      "SELECT id, username, display_name, email, language, avatar_index, created_at FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  },
  existsById: async (id) => {
    const result = await pool.query(
      "SELECT 1 FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return result.rowCount > 0;
  },
  findByUsernameAndPassword: async (username, password) => {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );
    return result.rows[0];
  },
  updateByUsernameAndPassword: async (username, password, updates) => {
    const setClauses = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${i}`);
      values.push(value);
      i++;
    }
    values.push(username, password);
    const result = await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE username = $${i} AND password = $${i + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  },
  deleteByUsernameAndPassword: async (username, password) => {
    const result = await pool.query(
      "DELETE FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );
    return result.rowCount > 0;
  },
  setOnboardingCompleted: async (userId, completed) => {
    await pool.query(
      "UPDATE users SET onboarding_completed = $2 WHERE id = $1",
      [userId, completed]
    );
  }
};