const pool = require("../db");

const KANJI_SELECT = `
  SELECT literal, grade, jlpt_level, stroke_count, radical,
         meaning, on_readings, kun_readings, pinyin`;

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
    `${KANJI_SELECT} FROM kanji WHERE meaning ILIKE $1`,
    [`%${query}%`]
  );
  return rows;
}

async function findByOnReading(reading) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE on_readings ILIKE $1 ORDER BY grade ASC NULLS LAST`,
    [`%${reading}%`]
  );
  return rows;
}

async function findByKunReading(reading) {
  const { rows } = await pool.query(
    `${KANJI_SELECT} FROM kanji WHERE kun_readings ILIKE $1 ORDER BY grade ASC NULLS LAST`,
    [`%${reading}%`]
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
