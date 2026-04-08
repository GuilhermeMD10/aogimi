const pool = require("../db");

async function findByLiteral(literal) {
  const { rows } = await pool.query(
    `SELECT literal, grade, stroke_count, meaning FROM kanji WHERE literal = $1`,
    [literal]
  );
  return rows[0] ?? null;
}

async function findByGrade(grade) {
  const { rows } = await pool.query(
    `SELECT literal, grade, stroke_count, meaning FROM kanji
     WHERE grade = $1 ORDER BY stroke_count ASC`,
    [grade]
  );
  return rows;
}

async function findByStrokeCount(count) {
  const { rows } = await pool.query(
    `SELECT literal, grade, stroke_count, meaning FROM kanji WHERE stroke_count = $1`,
    [count]
  );
  return rows;
}

module.exports = { findByLiteral, findByGrade, findByStrokeCount };
