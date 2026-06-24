const pool = require("../db");

module.exports = {
  upsert: async ({ deviceId, userId, name }) => {
    const result = await pool.query(
      `INSERT INTO devices (device_id, user_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_id, user_id)
       DO UPDATE SET last_seen_at = now(), name = COALESCE(NULLIF($3, ''), devices.name)
       RETURNING *`,
      [deviceId, userId, name || ""]
    );
    return result.rows[0];
  },

  findByUser: async (userId) => {
    const result = await pool.query(
      `SELECT d.*,
              COUNT(ba.book_id)::int AS book_count
       FROM devices d
       LEFT JOIN book_availability ba
         ON ba.device_id = d.device_id AND ba.user_id = d.user_id
       WHERE d.user_id = $1
       GROUP BY d.device_id, d.user_id
       ORDER BY d.last_seen_at DESC`,
      [userId]
    );
    return result.rows;
  },

  rename: async (deviceId, userId, name) => {
    const result = await pool.query(
      `UPDATE devices SET name = $3 WHERE device_id = $1 AND user_id = $2 RETURNING *`,
      [deviceId, userId, name]
    );
    return result.rows[0];
  },

  remove: async (deviceId, userId) => {
    const result = await pool.query(
      `DELETE FROM devices WHERE device_id = $1 AND user_id = $2`,
      [deviceId, userId]
    );
    return result.rowCount > 0;
  },

  markBookAvailable: async (userId, deviceId, bookId) => {
    const result = await pool.query(
      `INSERT INTO book_availability (user_id, device_id, book_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, device_id, book_id) DO UPDATE SET available_at = now()
       RETURNING *`,
      [userId, deviceId, bookId]
    );
    return result.rows[0];
  },

  removeBookAvailability: async (userId, deviceId, bookId) => {
    const result = await pool.query(
      `DELETE FROM book_availability WHERE user_id = $1 AND device_id = $2 AND book_id = $3`,
      [userId, deviceId, bookId]
    );
    return result.rowCount > 0;
  },

  getDeviceBooks: async (userId, deviceId) => {
    const result = await pool.query(
      `SELECT bp.*,
              CASE WHEN ba.book_id IS NOT NULL THEN true ELSE false END AS available
       FROM book_progress bp
       LEFT JOIN book_availability ba
         ON ba.book_id = bp.id AND ba.device_id = $2 AND ba.user_id = $1
       WHERE bp.user_id = $1
       ORDER BY bp.last_read_at DESC`,
      [userId, deviceId]
    );
    return result.rows;
  },
};
