const pool = require("../db");

async function findByKanji(kanji) {
  const { rows } = await pool.query(
    `SELECT id, kanji, kana, meaning FROM names WHERE kanji = $1`,
    [kanji]
  );
  return rows;
}

async function findByKana(kana) {
  const { rows } = await pool.query(
    `SELECT id, kanji, kana, meaning FROM names WHERE kana = $1`,
    [kana]
  );
  return rows;
}

module.exports = { findByKanji, findByKana };
