const nameRepo = require("../repositories/nameRepository");

function assembleName(row) {
  return {
    id: row.id,
    kanji: row.kanji ?? null,
    kana: row.kana,
    translations: row.meaning ? row.meaning.split("; ").map((s) => s.trim()) : [],
  };
}

async function getByKanji(kanji) {
  try {
    const rows = await nameRepo.findByKanji(kanji);
    return rows.map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByKanji failed: ${err.message}`);
  }
}

async function getByKana(kana) {
  try {
    const rows = await nameRepo.findByKana(kana);
    return rows.map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByKana failed: ${err.message}`);
  }
}

module.exports = { getByKanji, getByKana };
