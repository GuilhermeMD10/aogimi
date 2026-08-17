const pool = require("../db");
const { LIMITS } = require("../config/limits");

const KANJI_SELECT = `
  SELECT literal, grade, jlpt_level, stroke_count, radical,
         meaning, on_readings, kun_readings, pinyin`;

// The three pattern queries (meaning / on / kun) are capped: they're
// leading-wildcard ILIKEs on an UNAUTHENTICATED route, so `?meaning=a`
// matched most of the table with a full scan and returned all of it.
//
// The enumeration queries (grade / strokes / radical) are deliberately NOT
// capped. They're bounded by the table — KANJIDIC2 is ~13k rows and the
// largest single group is one grade — and capping them would silently
// truncate the thing they exist to return ("every grade 1-6 kanji"). Their
// inputs come from `searchService`, which only ever passes literals.
const CAP = LIMITS.DICTIONARY_RESULTS;

async function findByLiteral(literal) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE literal = $1`,
    [literal]
  );
  return rows[0] ?? null;
}







async function findByOnReading(reading) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE on_readings ILIKE $1 ORDER BY grade ASC NULLS LAST LIMIT $2`,
    [`%${reading}%`, CAP]
  );
  return rows;
}

async function findByKunReading(reading) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE kun_readings ILIKE $1 ORDER BY grade ASC NULLS LAST LIMIT $2`,
    [`%${reading}%`, CAP]
  );
  return rows;
}

async function findByLiterals(literals) {
  if (!literals.length) return [];
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE literal = ANY($1)`,
    [literals]
  );
  return rows;
}

async function findGradesByLiterals(literals) {
  if (!literals.length) return [];
  const { rows } = await pool.query(
    `SELECT literal, grade FROM kanji WHERE literal = ANY($1)`,
    [literals]
  );
  return rows;
}

module.exports = {
  findByLiteral,
  findByLiterals,
  findByOnReading,
  findByKunReading,
  findGradesByLiterals,
};
