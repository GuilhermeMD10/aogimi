const wordRepo = require("../repositories/wordRepository");
const { assembleWords } = require("./assembler");

async function getByKanji(kanji) {
  try {
    return assembleWords(await wordRepo.findByKanji(kanji));
  } catch (err) {
    throw new Error(`wordService.getByKanji failed: ${err.message}`);
  }
}

async function getByKana(kana) {
  try {
    return assembleWords(await wordRepo.findByKana(kana));
  } catch (err) {
    throw new Error(`wordService.getByKana failed: ${err.message}`);
  }
}

async function getByMeaning(query, lang = "eng") {
  try {
    return assembleWords(await wordRepo.findByMeaning(query, lang));
  } catch (err) {
    throw new Error(`wordService.getByMeaning failed: ${err.message}`);
  }
}

async function getById(id) {
  try {
    const assembled = assembleWords(await wordRepo.findById(id));
    return assembled.length > 0 ? assembled[0] : null;
  } catch (err) {
    throw new Error(`wordService.getById failed: ${err.message}`);
  }
}

async function getKanaPrefix(prefix, limit) {
  try {
    return await wordRepo.findByKanaPrefix(prefix, limit);
  } catch (err) {
    throw new Error(`wordService.getKanaPrefix failed: ${err.message}`);
  }
}

async function getCommonByKanji(kanji) {
  try {
    return assembleWords(await wordRepo.findCommonByKanji(kanji));
  } catch (err) {
    throw new Error(`wordService.getCommonByKanji failed: ${err.message}`);
  }
}

async function getByPos(pos, lang) {
  try {
    return assembleWords(await wordRepo.findByPos(pos, lang));
  } catch (err) {
    throw new Error(`wordService.getByPos failed: ${err.message}`);
  }
}

async function getByMeaningAndPos(query, pos, lang) {
  try {
    return assembleWords(await wordRepo.findByMeaningAndPos(query, pos, lang));
  } catch (err) {
    throw new Error(`wordService.getByMeaningAndPos failed: ${err.message}`);
  }
}

async function getByPriority(marker) {
  try {
    return assembleWords(await wordRepo.findByPriority(marker));
  } catch (err) {
    throw new Error(`wordService.getByPriority failed: ${err.message}`);
  }
}

async function getAllLangsById(id) {
  try {
    return await wordRepo.findAllLangsById(id);
  } catch (err) {
    throw new Error(`wordService.getAllLangsById failed: ${err.message}`);
  }
}

async function getKanaOnly(limit) {
  try {
    return assembleWords(await wordRepo.findKanaOnly(limit));
  } catch (err) {
    throw new Error(`wordService.getKanaOnly failed: ${err.message}`);
  }
}

module.exports = {
  getByKanji,
  getByKana,
  getByMeaning,
  getById,
  getKanaPrefix,
  getCommonByKanji,
  getByPos,
  getByMeaningAndPos,
  getByPriority,
  getAllLangsById,
  getKanaOnly,
};
