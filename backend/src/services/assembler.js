/**
 * Score a JMdict `ke_pri` / `re_pri` tag list (comma-joined as stored in
 * `word_kanji.priority` / `word_readings.priority`). Higher = more common.
 *
 * Weights are aligned with migration 008's word-level scoring and with
 * the SQL scoring in `PgSearchIndex.hydrate()` — change one, change all
 * three so the detail page and search list agree on the canonical form.
 *
 * Tiers:
 *   - `ichi1`: +50      `news1`: +40      `gai1`: +30      `spec1`: +20
 *   - `nf01..nf05`: +20  `nf06..nf12`: +10  `nf13..nf24`: +5  (rest: 0)
 *   - everything else (`ichi2`, `news2`, `oK`, …): 0
 *
 * No tags → 0. The canonical form for an entry typically carries one or
 * more top-tier markers and an `nfNN` band, so it dominates variants and
 * outdated forms even when both are jōyō.
 */
function priorityScore(priorityCsv) {
  if (!priorityCsv) return 0;
  let score = 0;
  for (const tag of priorityCsv.split(",")) {
    const t = tag.trim();
    if (!t) continue;
    if (t === "ichi1") score += 50;
    else if (t === "news1") score += 40;
    else if (t === "gai1") score += 30;
    else if (t === "spec1") score += 20;
    else if (t.startsWith("nf")) {
      const band = Number.parseInt(t.slice(2), 10);
      if (!Number.isFinite(band) || band < 1) continue;
      if (band <= 5) score += 20;
      else if (band <= 12) score += 10;
      else if (band <= 24) score += 5;
    }
  }
  return score;
}

function assembleWords(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.word_id)) {
      map.set(row.word_id, {
        id: row.word_id,
        is_common: row.is_common,
        jlpt_level: row.jlpt_level ?? null,
        grade: null,
        // Map<form, score> — dedup form and remember its best score.
        kanji: new Map(),
        // Map<form, { score, pitchAccents }> — same dedup, but also carries
        // pitch (which is reading-level, not row-level).
        readings: new Map(),
        meanings: [],
      });
    }
    const w = map.get(row.word_id);
    if (row.kanji) {
      const s = priorityScore(row.kanji_priority);
      if (!w.kanji.has(row.kanji) || w.kanji.get(row.kanji) < s) {
        w.kanji.set(row.kanji, s);
      }
    }
    if (row.kana) {
      const s = priorityScore(row.kana_priority);
      const existing = w.readings.get(row.kana);
      if (!existing || existing.score < s) {
        w.readings.set(row.kana, {
          score: s,
          pitchAccents: row.kana_pitch_accents ?? existing?.pitchAccents ?? null,
        });
      } else if (existing.pitchAccents == null && row.kana_pitch_accents != null) {
        // Same form, equal-or-lower score, but the higher-scored row didn't
        // carry pitch — fill it in from this row.
        existing.pitchAccents = row.kana_pitch_accents;
      }
    }
    if (
      row.meaning &&
      !w.meanings.some((m) => m.meaning === row.meaning && m.lang === row.lang)
    ) {
      w.meanings.push({ meaning: row.meaning, pos: row.pos ?? null, lang: row.lang ?? "eng" });
    }
  }
  return Array.from(map.values()).map((w) => ({
    ...w,
    kanji: sortKanji(w.kanji),
    readings: sortReadings(w.readings),
  }));
}

/** Stable descending sort by score; `Array.from(Map)` preserves insertion
 *  order, which together with a stable `sort` keeps equal-score forms in
 *  their original JMdict order — exactly what we want when no priority tag
 *  distinguishes variants. */
function sortKanji(map) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([form]) => form);
}

function sortReadings(map) {
  return Array.from(map.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([form, { pitchAccents }]) => ({ form, pitchAccents }));
}

module.exports = { assembleWords };
