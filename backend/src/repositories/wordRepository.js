const pool = require("../db");

const WORD_SELECT = `
  SELECT w.id AS word_id, w.is_common, w.jlpt_level,
         wk.kanji, wk.priority AS kanji_priority,
         wr.kana,  wr.priority AS kana_priority,
         wm.meaning, wm.pos, wm.lang`;

async function findByKanji(kanji, limit = 50) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_kanji wk
     JOIN words w ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wk.kanji = $1
     ORDER BY w.is_common DESC
     LIMIT $2`,
    [kanji, limit]
  );
  return rows;
}

async function findByKana(kana, limit = 50) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_readings wr
     JOIN words w ON wr.word_id = w.id
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wr.kana = $1
     ORDER BY w.is_common DESC
     LIMIT $2`,
    [kana, limit]
  );
  return rows;
}

async function findByMeaning(query, lang = "eng", limit = 50) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_meanings wm
     JOIN words w ON wm.word_id = w.id
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     WHERE to_tsvector('english', wm.meaning) @@ plainto_tsquery('english', $1)
       AND wm.lang = $2
     ORDER BY w.is_common DESC
     LIMIT $3`,
    [query, lang, limit]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM words w
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE w.id = $1`,
    [id]
  );
  return rows;
}

// Prefix search on kana — useful for autocomplete
async function findByKanaPrefix(prefix, limit = 20) {
  const { rows } = await pool.query(
    `SELECT DISTINCT wr.kana, wk.kanji
     FROM word_readings wr
     LEFT JOIN word_kanji wk ON wk.word_id = wr.word_id
     WHERE wr.kana LIKE $1
     ORDER BY wr.kana
     LIMIT $2`,
    [`${prefix}%`, limit]
  );
  return rows;
}

// Common words only filter
async function findCommonByKanji(kanji) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_kanji wk
     JOIN words w ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wk.kanji = $1
       AND w.is_common = true
       AND wm.lang = 'eng'`,
    [kanji]
  );
  return rows;
}

// Filter by part of speech
async function findByPos(pos, lang = "eng") {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_meanings wm
     JOIN words w ON wm.word_id = w.id
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     WHERE wm.pos ILIKE $1
       AND wm.lang = $2
       AND w.is_common = true
     LIMIT 50`,
    [`%${pos}%`, lang]
  );
  return rows;
}

// Meaning search + POS filter
async function findByMeaningAndPos(query, pos, lang = "eng") {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_meanings wm
     JOIN words w ON wm.word_id = w.id
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     WHERE to_tsvector('english', wm.meaning) @@ plainto_tsquery('english', $1)
       AND wm.pos ILIKE $2
       AND wm.lang = $3`,
    [query, `%${pos}%`, lang]
  );
  return rows;
}

// Filter by priority marker (e.g. "ichi1", "news1")
async function findByPriority(marker) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_kanji wk
     JOIN words w ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wk.priority LIKE $1`,
    [`%${marker}%`]
  );
  return rows;
}

// All translations for one word across all languages
async function findAllLangsById(id) {
  const { rows } = await pool.query(
    `SELECT wm.lang, wm.meaning, wm.pos
     FROM word_meanings wm
     WHERE wm.word_id = $1
     ORDER BY wm.lang, wm.meaning`,
    [id]
  );
  return rows;
}

// Words whose kanji form contains the character (used for single-kanji searches)
async function findByKanjiContaining(char, limit = 50) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM word_kanji wk
     JOIN words w ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wk.kanji LIKE $1
       AND wm.lang = 'eng'
     ORDER BY w.is_common DESC
     LIMIT $2`,
    [`%${char}%`, limit]
  );
  return rows;
}

// Kana-only words (no kanji form)
async function findKanaOnly(limit = 50) {
  const { rows } = await pool.query(
    `${WORD_SELECT}
     FROM words w
     LEFT JOIN word_kanji wk ON wk.word_id = w.id
     LEFT JOIN word_readings wr ON wr.word_id = w.id
     LEFT JOIN word_meanings wm ON wm.word_id = w.id
     WHERE wk.id IS NULL
       AND wm.lang = 'eng'
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  findByKanji,
  findByKana,
  findByMeaning,
  findById,
  findByKanaPrefix,
  findCommonByKanji,
  findByPos,
  findByMeaningAndPos,
  findByPriority,
  findAllLangsById,
  findKanaOnly,
  findByKanjiContaining,
};
