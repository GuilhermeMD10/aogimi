const kanjiRepo = require("../repositories/kanjiRepository");

function assembleKanji(row) {
  return {
    literal: row.literal,
    grade: row.grade,
    stroke_count: row.stroke_count,
    radical: row.radical ?? null,
    meanings: row.meaning ? row.meaning.split(", ").map((s) => s.trim()) : [],
    on_readings: row.on_readings ? row.on_readings.split(", ").map((s) => s.trim()) : [],
    kun_readings: row.kun_readings ? row.kun_readings.split(", ").map((s) => s.trim()) : [],
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
    return (await kanjiRepo.findByGrade(grade)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByGrade failed: ${err.message}`);
  }
}

async function getByGradeRange(min, max) {
  try {
    return (await kanjiRepo.findByGradeRange(min, max)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByGradeRange failed: ${err.message}`);
  }
}

async function getByStrokeCount(count) {
  try {
    return (await kanjiRepo.findByStrokeCount(count)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByStrokeCount failed: ${err.message}`);
  }
}

async function getByStrokeRange(min, max) {
  try {
    return (await kanjiRepo.findByStrokeRange(min, max)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByStrokeRange failed: ${err.message}`);
  }
}

async function getByRadical(radical) {
  try {
    return (await kanjiRepo.findByRadical(radical)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByRadical failed: ${err.message}`);
  }
}

async function getByMeaning(query) {
  try {
    return (await kanjiRepo.findByMeaning(query)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByMeaning failed: ${err.message}`);
  }
}

async function getByOnReading(reading) {
  try {
    return (await kanjiRepo.findByOnReading(reading)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByOnReading failed: ${err.message}`);
  }
}

async function getByKunReading(reading) {
  try {
    return (await kanjiRepo.findByKunReading(reading)).map(assembleKanji);
  } catch (err) {
    throw new Error(`kanjiService.getByKunReading failed: ${err.message}`);
  }
}

module.exports = {
  getByLiteral,
  getByGrade,
  getByGradeRange,
  getByStrokeCount,
  getByStrokeRange,
  getByRadical,
  getByMeaning,
  getByOnReading,
  getByKunReading,
};
