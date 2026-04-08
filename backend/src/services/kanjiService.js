const kanjiRepo = require("../repositories/kanjiRepository");

function assembleKanji(row) {
  return {
    literal: row.literal,
    grade: row.grade,
    stroke_count: row.stroke_count,
    meanings: row.meaning ? row.meaning.split(", ").map((s) => s.trim()) : [],
  };
}

async function getByLiteral(literal) {
  try {
    const row = await kanjiRepo.findByLiteral(literal);
    return row ? assembleKanji(row) : null;
  } catch (err) {
    throw new Error(`kanjiService.getByLiteral failed: ${err.message}`);
  }
}

async function getByGrade(grade) {
  try {
    const rows = await kanjiRepo.findByGrade(grade);
    return rows.map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByGrade failed: ${err.message}`);
  }
}

async function getByStrokeCount(count) {
  try {
    const rows = await kanjiRepo.findByStrokeCount(count);
    return rows.map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByStrokeCount failed: ${err.message}`);
  }
}

module.exports = { getByLiteral, getByGrade, getByStrokeCount };
