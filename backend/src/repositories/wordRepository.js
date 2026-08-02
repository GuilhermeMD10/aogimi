const pool = require("../db");
const { LIMITS } = require("../config/limits");

const WORD_SELECT = `
  SELECT w.id AS word_id, w.is_common, w.jlpt_level,
         wk.kanji, wk.priority AS kanji_priority,
         wr.kana,  wr.priority AS kana_priority, wr.pitch_accents AS kana_pitch_accents,
         wm.meaning, wm.pos, wm.lang`;

// Backstop cap for the queries that had no LIMIT: `findCommonByKanji`,
// `findByMeaningAndPos` and `findByPriority`. The last two are the reason —
// both are pattern matches on UNAUTHENTICATED routes (`?marker=1` matches
// nearly every prioritised entry; `?q=the&pos=n` matches most of the gloss
// table) and both returned the full result set.
//
// Note this bounds TUPLES, not words: WORD_SELECT is a word × reading ×
// meaning cross product that `services/assembler.js` regroups, so a capped
// query can truncate the last word's readings. That's the same trade the
// already-capped queries here make (`findByPos` has had a bare LIMIT 50
// since it was written), so the behaviour is consistent rather than new.
const CAP = LIMITS.DICTIONARY_RESULTS;

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
       AND wm.lang = 'eng'
     LIMIT $2`,
    [kanji, CAP]
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
       AND wm.lang = $3
     LIMIT $4`,
    [query, `%${pos}%`, lang, CAP]
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
     WHERE wk.priority LIKE $1
     LIMIT $2`,
    [`%${marker}%`, CAP]
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
