function assembleWords(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.word_id)) {
      map.set(row.word_id, {
        id: row.word_id,
        is_common: row.is_common,
        jlpt_level: row.jlpt_level ?? null,
        grade: null,
        kanji: new Set(),
        readings: new Set(),
        meanings: [],
      });
    }
    const w = map.get(row.word_id);
    if (row.kanji) w.kanji.add(row.kanji);
    if (row.kana) w.readings.add(row.kana);
    if (
      row.meaning &&
      !w.meanings.some((m) => m.meaning === row.meaning && m.lang === row.lang)
    ) {
      w.meanings.push({ meaning: row.meaning, pos: row.pos ?? null, lang: row.lang ?? "eng" });
    }
  }
  return Array.from(map.values()).map((w) => ({
    ...w,
    kanji: [...w.kanji],
    readings: [...w.readings],
  }));
}

module.exports = { assembleWords };
