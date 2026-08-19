const pool = require("../db");
const { LIMITS } = require("../config/limits");

const NAME_SELECT = `SELECT id, kanji, kana, name_type, meaning`;

// Every query here is capped. `names` is the JMnedict import — hundreds of
// thousands of rows — and these are UNAUTHENTICATED endpoints; the equality
// lookups are naturally small but share the cap so there's one number to
// reason about.
//
// The cap is above what any caller uses: searchService hands name rows to
// `assembleNameRow` and the web client renders `names.slice(0, 10)`.
const CAP = LIMITS.DICTIONARY_RESULTS;

async function findByKanji(kanji) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names WHERE kanji = $1 LIMIT $2`,
    [kanji, CAP]
  );
  return rows;
}

async function findByKana(kana) {
  const { rows } = await pool.query(
    `${NAME_SELECT} FROM names WHERE kana = $1 LIMIT $2`,
    [kana, CAP]
  );
  return rows;
}

module.exports = { findByKanji, findByKana };
