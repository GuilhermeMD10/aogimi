const pool = require("../db");

async function findByKanji(kanji) {
  const { rows } = await pool.query(
    `SELECT w.id AS word_id, w.is_common, w.jlpt_level,
            wk.kanji, wr.kana, wm.meaning, wm.pos
     FROM word_kanji wk
     JOIN words w ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wk.kanji = $1`,
    [kanji]
  );
  return rows;
}

async function findByKana(kana) {
  const { rows } = await pool.query(
    `SELECT w.id AS word_id, w.is_common, w.jlpt_level,
            wk.kanji, wr.kana, wm.meaning, wm.pos
     FROM word_readings wr
     JOIN words w ON wr.word_id = w.id
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wr.kana = $1`,
    [kana]
  );
  return rows;
}

async function findByMeaning(query) {
  const { rows } = await pool.query(
    `SELECT w.id AS word_id, w.is_common, w.jlpt_level,
            wk.kanji, wr.kana, wm.meaning, wm.pos
     FROM word_meanings wm
     JOIN words w ON wm.word_id = w.id
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     WHERE to_tsvector('english', wm.meaning) @@ plainto_tsquery('english', $1)
     ORDER BY w.is_common DESC`,
    [query]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT w.id AS word_id, w.is_common, w.jlpt_level,
            wk.kanji, wr.kana, wm.meaning, wm.pos
     FROM words w
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE w.id = $1`,
    [id]
  );
  return rows;
}

module.exports = { findByKanji, findByKana, findByMeaning, findById };
