const wordRepo = require("../repositories/wordRepository");

function assembleWords(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.word_id)) {
      map.set(row.word_id, {
        id: row.word_id,
        is_common: row.is_common,
        jlpt_level: row.jlpt_level,
        kanji: new Set(),
        readings: new Set(),
        meanings: [],
      });
    }
    const w = map.get(row.word_id);
    if (row.kanji) w.kanji.add(row.kanji);
    if (row.kana) w.readings.add(row.kana);
    if (row.meaning && !w.meanings.some((m) => m.meaning === row.meaning)) {
      w.meanings.push({ meaning: row.meaning, pos: row.pos ?? null });
    }
  }
  return Array.from(map.values()).map((w) => ({
    ...w,
    kanji: [...w.kanji],
    readings: [...w.readings],
  }));
}

async function getByKanji(kanji) {
  try {
    const rows = await wordRepo.findByKanji(kanji);
    return assembleWords(rows);
  } catch (err) {
    throw new Error(`wordService.getByKanji failed: ${err.message}`);
  }
}

async function getByKana(kana) {
  try {
    const rows = await wordRepo.findByKana(kana);
    return assembleWords(rows);
  } catch (err) {
    throw new Error(`wordService.getByKana failed: ${err.message}`);
  }
}

async function getByMeaning(query) {
  try {
    const rows = await wordRepo.findByMeaning(query);
    return assembleWords(rows);
  } catch (err) {
    throw new Error(`wordService.getByMeaning failed: ${err.message}`);
  }
}

async function getById(id) {
  try {
    const rows = await wordRepo.findById(id);
    const assembled = assembleWords(rows);
    return assembled.length > 0 ? assembled[0] : null;
  } catch (err) {
    throw new Error(`wordService.getById failed: ${err.message}`);
  }
}

module.exports = { getByKanji, getByKana, getByMeaning, getById };
