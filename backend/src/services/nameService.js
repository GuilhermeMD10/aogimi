const nameRepo = require("../repositories/nameRepository");

function assembleName(row) {
  return {
    id: row.id,
    kanji: row.kanji ?? null,
    kana: row.kana,
    name_type: row.name_type ? row.name_type.split(",").map((s) => s.trim()) : [],
    translations: row.meaning ? row.meaning.split("; ").map((s) => s.trim()) : [],
  };
}

async function getByKanji(kanji) {
  try {
    return (await nameRepo.findByKanji(kanji)).map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByKanji failed: ${err.message}`);
  }
}

async function getByKana(kana) {
  try {
    return (await nameRepo.findByKana(kana)).map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByKana failed: ${err.message}`);
  }
}

async function getByKanaPrefix(prefix, limit) {
  try {
    return (await nameRepo.findByKanaPrefix(prefix, limit)).map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByKanaPrefix failed: ${err.message}`);
  }
}

async function getByType(type) {
  try {
    return (await nameRepo.findByType(type)).map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByType failed: ${err.message}`);
  }
}

async function getByMeaning(query) {
  try {
    return (await nameRepo.findByMeaning(query)).map(assembleName);
  } catch (err) {
    throw new Error(`nameService.getByMeaning failed: ${err.message}`);
  }
}

module.exports = { getByKanji, getByKana, getByKanaPrefix, getByType, getByMeaning };
