const kanjiRepo = require('../repositories/kanjiRepository');
const nameRepo  = require('../repositories/nameRepository');
const { index } = require('../search');
const { deinflect } = require('../search/deinflector');

/**
 * Unified search endpoint logic.
 *
 *   1. Normalize the query (NFKC, trim, lower-case for English).
 *   2. Detect its shape (single kanji / kanji+kana / kana / romaji).
 *   3. Route to the ranked search path for that shape.
 *   4. Hydrate the scored word IDs through the search index.
 *
 * The response shape is unchanged from the previous implementation so no
 * frontend change is required. A new optional `inflection` field is added to
 * word entries that matched only after deinflection.
 */

const IS_KANJI  = /\p{Script=Han}/u;
const IS_KANA   = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
// Require at least 2 chars so single letters like "a" don't get misrouted
// away from Japanese particle / kana search.
const IS_ROMAJI = /^[a-zA-Z][a-zA-Z\s'-]+$/;

const RESULT_LIMIT = 20;

function isSingleKanji(q) { return IS_KANJI.test(q) && [...q].length === 1; }
function hasKanji(q)      { return IS_KANJI.test(q); }

function normalize(raw) {
  return raw.trim().normalize('NFKC');
}

async function search(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    throw Object.assign(new Error('Query must not be empty'), { status: 400 });
  }
  const q = normalize(rawQuery);

  // ── 1. Single kanji character ───────────────────────────────────────────────
  if (isSingleKanji(q)) {
    const [kanjiRow, kanjiWordHits, nameRows] = await Promise.all([
      kanjiRepo.findByLiteral(q),
      index.searchByKanjiContaining(q, RESULT_LIMIT),
      nameRepo.findByKanji(q),
    ]);
    const words = await hydrateAndAnnotate(kanjiWordHits);
    return {
      type: 'kanji',
      kanji: kanjiRow ? formatKanji(kanjiRow) : null,
      words,
      names: nameRows.map(assembleNameRow),
    };
  }

  // ── 2. Kanji-containing word (e.g. 食べる, 食べた) ─────────────────────────
  if (hasKanji(q)) {
    return japaneseWithDeinflection(q, 'word');
  }

  // ── 3. Pure kana ────────────────────────────────────────────────────────────
  if (IS_KANA.test(q)) {
    const wordsPromise = japaneseWithDeinflection(q, 'kana');

    const [kanaResult, nameRows, onKanjis, kunKanjis] = await Promise.all([
      wordsPromise,
      nameRepo.findByKana(q),
      kanjiRepo.findByOnReading(q),
      kanjiRepo.findByKunReading(q),
    ]);

    // Merge + dedupe kanji hits, sort by grade (nulls last).
    const kanjiMap = new Map();
    for (const k of [...onKanjis, ...kunKanjis]) {
      if (!kanjiMap.has(k.literal)) kanjiMap.set(k.literal, k);
    }
    const kanjis = [...kanjiMap.values()]
      .sort((a, b) => {
        if (a.grade === null && b.grade === null) return 0;
        if (a.grade === null) return  1;
        if (b.grade === null) return -1;
        return a.grade - b.grade;
      })
      .map(formatKanji);

    return {
      type: 'kana',
      words: kanaResult.words,
      names: nameRows.map(assembleNameRow),
      kanjis,
    };
  }

  // ── 4. Romaji / English meaning ─────────────────────────────────────────────
  if (IS_ROMAJI.test(q)) {
    const englishQ = q.toLowerCase().replace(/[^\w\s-]/g, '');
    const hits = await index.searchEnglish(englishQ, RESULT_LIMIT);
    const words = await hydrateAndAnnotate(hits);
    return { type: 'meaning', words };
  }

  throw Object.assign(
    new Error('Enter a kanji, kana, or English word.'),
    { status: 400 },
  );
}

/**
 * Try direct lookup first; fall back to deinflected candidates if nothing
 * matches. Annotates deinflected hits with their inflection path so the
 * frontend can show "食べた → 食べる (past)".
 */
async function japaneseWithDeinflection(q, kind) {
  // Direct match — cheap, single indexed lookup.
  const direct = await index.searchJapaneseForms([q], RESULT_LIMIT);
  if (direct.length > 0) {
    return { type: kind, words: await hydrateAndAnnotate(direct) };
  }

  // No direct hit — try to deinflect.
  const candidates = deinflect(q);
  const forms = candidates.map(c => c.base).filter(f => f !== q);
  if (forms.length === 0) {
    return { type: kind, words: [] };
  }

  const hits = await index.searchJapaneseForms(forms, RESULT_LIMIT);
  const inflectionByForm = new Map(candidates.map(c => [c.base, c.inflections]));
  const hydrated = await hydrateAndAnnotate(hits, hit => ({
    from: q,
    path: inflectionByForm.get(hit.form) || [],
  }));

  return { type: kind, words: hydrated };
}

/**
 * Hydrate scored candidate rows, attach kanji-grade metadata (frontend
 * display uses it for G1..G6 badges), and attach per-hit inflection data
 * when provided. Preserves the scoring order supplied by the caller.
 */
async function hydrateAndAnnotate(hits, metaFn) {
  if (hits.length === 0) return [];

  // Deduplicate while preserving first-occurrence order (= highest score).
  const seen = new Set();
  const orderedIds = [];
  const metaById = new Map();
  for (const h of hits) {
    if (seen.has(h.word_id)) continue;
    seen.add(h.word_id);
    orderedIds.push(h.word_id);
    if (metaFn) metaById.set(h.word_id, metaFn(h));
  }

  const rows = await index.hydrate(orderedIds);
  await annotateKanjiGrades(rows);

  return rows.map(r => {
    const meta = metaById.get(r.id);
    // Strip internal-only priority_score from the public payload.
    const { priority_score: _p, ...publicRow } = r;
    return meta ? { ...publicRow, inflection: meta } : publicRow;
  });
}

/**
 * Batch-fetch kanji grades for every unique CJK character across the given
 * words, then annotate each word with `grade` (min grade of its kanji,
 * nulls last) and `char_grades` (per-character grade list). One round trip
 * regardless of word count — no N+1.
 */
async function annotateKanjiGrades(words) {
  const chars = new Set();
  for (const w of words) {
    for (const k of w.kanji) {
      for (const c of [...k]) {
        if (IS_KANJI.test(c)) chars.add(c);
      }
    }
  }
  if (chars.size === 0) {
    for (const w of words) { w.grade = null; w.char_grades = []; }
    return;
  }

  const gradeRows = await kanjiRepo.findGradesByLiterals([...chars]);
  const gradeMap = new Map(gradeRows.map(r => [r.literal, r.grade]));

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
}

// ── Helpers ────────────────────────────────────────────────────────────────

function split(value, sep) {
  return value ? value.split(sep).map(s => s.trim()) : [];
}

function formatKanji(row) {
  return {
    literal: row.literal,
    grade: row.grade ?? null,
    stroke_count: row.stroke_count,
    radical: row.radical ?? null,
    meanings:     split(row.meaning,      ', '),
    on_readings:  split(row.on_readings,  ', '),
    kun_readings: split(row.kun_readings, ', '),
  };
}

function assembleNameRow(row) {
  return {
    id: row.id,
    kanji: row.kanji ?? null,
    kana: row.kana,
    name_type:    split(row.name_type, ','),
    translations: split(row.meaning,   '; '),
  };
}

/**
 * Fetch the full detail payload for a single word id.
 *
 *   {
 *     word:   hydrated word (same shape search returns),
 *     kanjis: KanjiInfo[]  — one entry per unique CJK character in the word's
 *                             kanji forms, in first-occurrence order.
 *   }
 *
 * Reuses the search index's hydrate path so `priority_score` / `is_common`
 * and the grade annotation stay consistent with the search results. One
 * round-trip for the word row, one for the kanji rows.
 */
async function getDetails(id) {
  if (!Number.isFinite(id) || id <= 0) {
    throw Object.assign(new Error('Invalid id'), { status: 400 });
  }

  const rows = await index.hydrate([id]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Word not found'), { status: 404 });
  }
  await annotateKanjiGrades(rows);

  const word = rows[0];
  const { priority_score: _p, ...publicWord } = word;

  // Preserve first-occurrence order so the UI displays kanji left-to-right
  // following the surface form.
  const seen = new Set();
  const chars = [];
  for (const k of word.kanji) {
    for (const c of [...k]) {
      if (IS_KANJI.test(c) && !seen.has(c)) {
        seen.add(c);
        chars.push(c);
      }
    }
  }

  const kanjiRows = chars.length
    ? await kanjiRepo.findByLiterals(chars)
    : [];

  // Build a lookup map so we can return kanji in first-occurrence order.
  const kanjiMap = new Map(kanjiRows.map(r => [r.literal, r]));
  const kanjis = chars
    .map(c => {
      const row = kanjiMap.get(c);
      return row ? formatKanji(row) : { literal: c, grade: null,
        stroke_count: null, radical: null, meanings: [], on_readings: [], kun_readings: [] };
    });

  return { word: publicWord, kanjis };
}

module.exports = { search, getDetails };
