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
// inputs are already range-validated in routes/kanji.js.
const CAP = LIMITS.DICTIONARY_RESULTS;

async function findByLiteral(literal) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE literal = $1`,
    [literal]
  );
  return rows[0] ?? null;
}

async function findByGrade(grade) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE grade = $1 ORDER BY stroke_count ASC`,
    [grade]
  );
  return rows;
}

async function findByGradeRange(min, max) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji
     WHERE grade BETWEEN $1 AND $2
     ORDER BY grade, stroke_count`,
    [min, max]
  );
  return rows;
}

async function findByStrokeCount(count) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE stroke_count = $1`,
    [count]
  );
  return rows;
}

async function findByStrokeRange(min, max) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji
     WHERE stroke_count BETWEEN $1 AND $2
     ORDER BY stroke_count, grade NULLS LAST`,
    [min, max]
  );
  return rows;
}

async function findByRadical(radical) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE radical = $1 ORDER BY stroke_count`,
    [radical]
  );
  return rows;
}

async function findByMeaning(query) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE meaning ILIKE $1 LIMIT $2`,
    [`%${query}%`, CAP]
  );
  return rows;
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
  findByGrade,
  findByGradeRange,
  findByStrokeCount,
  findByStrokeRange,
  findByRadical,
  findByMeaning,
  findByOnReading,
  findByKunReading,
  findGradesByLiterals,
};
