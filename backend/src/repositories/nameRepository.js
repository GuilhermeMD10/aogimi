const pool = require("../db");

const NAME_SELECT = `SELECT id, kanji, kana, name_type, meaning`;

async function findByKanji(kanji) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names WHERE kanji = $1`,
    [kanji]
  );
  return rows;
}

async function findByKana(kana) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names WHERE kana = $1`,
    [kana]
  );
  return rows;
}

async function findByKanaPrefix(prefix, limit = 20) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names
     WHERE kana LIKE $1
     ORDER BY kana
     LIMIT $2`,
    [`${prefix}%`, limit]
  );
  return rows;
}

async function findByType(type) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names
     WHERE name_type LIKE $1
     ORDER BY kana`,
    [`%${type}%`]
  );
  return rows;
}

async function findByMeaning(query) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names WHERE meaning ILIKE $1`,
    [`%${query}%`]
  );
  return rows;
}

module.exports = { findByKanji, findByKana, findByKanaPrefix, findByType, findByMeaning };
