const wordRepo = require("../repositories/wordRepository");
const kanjiRepo = require("../repositories/kanjiRepository");
const nameRepo = require("../repositories/nameRepository");
const { assembleWords } = require("./assembler");

const IS_KANJI = /\p{Script=Han}/u;
const IS_KANA  = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
const IS_ROMAJI = /^[a-zA-Z\s]+$/;

const RESULT_LIMIT = 50;

// A single Han character with no kana alongside it — treat as kanji lookup
function isSingleKanji(q) {
  return IS_KANJI.test(q) && [...q].length === 1;
}

// Contains Han characters — kanji+kana word (e.g. 食べる)
function hasKanji(q) {
  return IS_KANJI.test(q);
}

// Batch-fetch kanji grades, assign to each word, sort common-first then grade ASC (nulls last)
async function sortByKanjiGrade(words) {
  const chars = new Set();
  for (const w of words) {
    for (const k of w.kanji) {
      for (const c of [...k]) {
        if (IS_KANJI.test(c)) chars.add(c);
      }
    }
  }

  const gradeMap = new Map();
  if (chars.size > 0) {
    const gradeRows = await kanjiRepo.findGradesByLiterals([...chars]);
    for (const r of gradeRows) gradeMap.set(r.literal, r.grade);
  }

  for (const w of words) {
    let min = null;
    const seen = new Set();
    w.char_grades = [];
    for (const k of w.kanji) {
      for (const c of [...k]) {
        if (!IS_KANJI.test(c)) continue;
        const g = gradeMap.get(c) ?? null;
        if (!seen.has(c)) {
          seen.add(c);
          w.char_grades.push({ char: c, grade: g });
        }
        if (g != null && (min === null || g < min)) min = g;
      }
    }
    w.grade = min;
  }

  return words
    .sort((a, b) => {
      const commonDiff = (b.is_common ? 1 : 0) - (a.is_common ? 1 : 0);
      if (commonDiff !== 0) return commonDiff;
      if (a.grade === null && b.grade === null) return 0;
      if (a.grade === null) return 1;
      if (b.grade === null) return -1;
      return a.grade - b.grade;
    })
    .slice(0, RESULT_LIMIT);
}

async function search(rawQuery) {
  const q = rawQuery.trim();
  if (!q) throw Object.assign(new Error("Query must not be empty"), { status: 400 });

  // ── 1. Single kanji character ────────────────────────────────────────────────
  if (isSingleKanji(q)) {
    const [kanjiRow, wordRows, nameRows] = await Promise.all([
      kanjiRepo.findByLiteral(q),
      wordRepo.findByKanjiContaining(q),
      nameRepo.findByKanji(q),
    ]);

    const words = await sortByKanjiGrade(assembleWords(wordRows));

    return {
      type: "kanji",
      kanji: kanjiRow ? formatKanji(kanjiRow) : null,
      words,
      names: nameRows.map(assembleNameRow),
    };
  }

  // ── 2. Kanji+kana word (e.g. 食べる) ────────────────────────────────────────
  if (hasKanji(q)) {
    const wordRows = await wordRepo.findByKanji(q);
    return { type: "word", words: await sortByKanjiGrade(assembleWords(wordRows)) };
  }

  // ── 3. Pure kana ────────────────────────────────────────────────────────────
  if (IS_KANA.test(q)) {
    const [wordRows, nameRows, onKanjis, kunKanjis] = await Promise.all([
      wordRepo.findByKana(q),
      nameRepo.findByKana(q),
      kanjiRepo.findByOnReading(q),
      kanjiRepo.findByKunReading(q),
    ]);

    // Merge on+kun kanji hits, deduplicate by literal, already sorted by grade from DB
    const kanjiMap = new Map();
    for (const k of [...onKanjis, ...kunKanjis]) {
      if (!kanjiMap.has(k.literal)) kanjiMap.set(k.literal, k);
    }
    const kanjis = Array.from(kanjiMap.values())
      .sort((a, b) => {
        if (a.grade === null && b.grade === null) return 0;
        if (a.grade === null) return 1;
        if (b.grade === null) return -1;
        return a.grade - b.grade;
      })
      .map(formatKanji);

    return {
      type: "kana",
      words: await sortByKanjiGrade(assembleWords(wordRows)),
      names: nameRows.map(assembleNameRow),
      kanjis,
    };
  }

  // ── 4. Romaji / English meaning ──────────────────────────────────────────────
  if (IS_ROMAJI.test(q)) {
    const wordRows = await wordRepo.findByMeaning(q, "eng");
    return { type: "meaning", words: await sortByKanjiGrade(assembleWords(wordRows)) };
  }

  throw Object.assign(
    new Error("Enter a kanji, kana, or English word."),
    { status: 400 }
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function split(value, sep) {
  return value ? value.split(sep).map((s) => s.trim()) : [];
}

function formatKanji(row) {
  return {
    literal: row.literal,
    grade: row.grade ?? null,
    stroke_count: row.stroke_count,
    radical: row.radical ?? null,
    meanings: split(row.meaning, ", "),
    on_readings: split(row.on_readings, ", "),
    kun_readings: split(row.kun_readings, ", "),
  };
}

function assembleNameRow(row) {
  return {
    id: row.id,
    kanji: row.kanji ?? null,
    kana: row.kana,
    name_type: split(row.name_type, ","),
    translations: split(row.meaning, "; "),
  };
}

module.exports = { search };
