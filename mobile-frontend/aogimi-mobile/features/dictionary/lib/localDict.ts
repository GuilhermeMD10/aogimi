// Public surface of the offline dictionary on mobile. Mirrors the two
// dictApi.ts functions that previously hit the backend:
//
//   searchLocal(query)        → SearchResponse  (same shape as GET /api/search)
//   getWordDetailsLocal(id)   → WordDetails     (same shape as GET /api/words/:id/details)
//
// Internally this is a port of `backend/src/services/searchService.js`.
// Query routing, ranking, deinflection, and the post-hydrate sort
// tiebreakers are all preserved so users get identical results online
// and offline. Differences are limited to the SQLite-vs-Postgres
// substrate (see searchIndex.ts for the SQL-level changes).

import type {
  ExampleSentence,
  KanjiInfo,
  NameResult,
  SearchResponse,
  WordDetails,
  WordResult,
} from '@/features/dictionary/types';
import { deinflect } from './deinflector';
import { romajiToKana } from './romajiToKana';
import {
  findExampleSentences,
  findKanjiByKunReading,
  findKanjiByLiteral,
  findKanjiByLiterals,
  findKanjiByOnReading,
  findKanjiGradesByLiterals,
  findNamesByKana,
  findNamesByKanji,
  hydrate,
  searchByKanjiContaining,
  searchEnglish,
  searchJapaneseForms,
  type HydratedWord,
  type KanjiRow,
  type NameRow,
  type ScoredHit,
} from './searchIndex';

const RESULT_LIMIT = 20;
const SENTENCE_LIMIT = 5;

const IS_KANJI = /\p{Script=Han}/u;
const IS_KANA = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
const IS_ROMAJI = /^[a-zA-Z][a-zA-Z\s'-]+$/;

function isSingleKanji(q: string): boolean {
  return IS_KANJI.test(q) && Array.from(q).length === 1;
}

function hasKanji(q: string): boolean {
  return IS_KANJI.test(q);
}

function normalize(raw: string): string {
  return raw.trim().normalize('NFKC');
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function searchLocal(rawQuery: string): Promise<SearchResponse> {
  if (!rawQuery || !rawQuery.trim()) {
    throw new Error('Query must not be empty');
  }
  const q = normalize(rawQuery);

  // 1. Single kanji → triple-lookup (kanji table, kanji-containing words, names)
  if (isSingleKanji(q)) {
    const [kanjiRow, kanjiWordHits, nameRows] = await Promise.all([
      findKanjiByLiteral(q),
      searchByKanjiContaining(q, RESULT_LIMIT),
      findNamesByKanji(q),
    ]);
    const words = await hydrateAndAnnotate(kanjiWordHits);
    return {
      type: 'kanji',
      kanji: kanjiRow ? formatKanji(kanjiRow) : null,
      words,
      names: nameRows.map(assembleNameRow),
    };
  }

  // 2. Kanji-containing word
  if (hasKanji(q)) {
    return japaneseWithDeinflection(q, 'word');
  }

  // 3. Pure kana
  if (IS_KANA.test(q)) {
    const [kanaResult, nameRows, onKanjis, kunKanjis] = await Promise.all([
      japaneseWithDeinflection(q, 'kana'),
      findNamesByKana(q),
      findKanjiByOnReading(q),
      findKanjiByKunReading(q),
    ]);

    const kanjiMap = new Map<string, KanjiRow>();
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

    // Narrow the union: kanaResult is typed as SearchResponse, but the
    // 'kana' branch is the only one japaneseWithDeinflection emits here.
    const words = 'words' in kanaResult ? kanaResult.words : [];

    return {
      type: 'kana',
      words,
      names: nameRows.map(assembleNameRow),
      kanjis,
    };
  }

  // 4. Romaji / English
  if (IS_ROMAJI.test(q)) {
    const englishQ = q.toLowerCase().replace(/[^\w\s-]/g, '');
    const kana = romajiToKana(q);

    const [jpResult, englishHits] = await Promise.all([
      kana ? japaneseWithDeinflection(kana, 'kana') : Promise.resolve(null),
      searchEnglish(englishQ, RESULT_LIMIT),
    ]);

    const englishWords = await hydrateAndAnnotate(englishHits);

    if (jpResult && 'words' in jpResult && jpResult.words.length > 0) {
      const seenIds = new Set(jpResult.words.map((w) => w.id));
      const deduped = englishWords.filter((w) => !seenIds.has(w.id));
      const merged = [...jpResult.words, ...deduped].slice(0, RESULT_LIMIT);
      return { type: 'meaning', words: merged };
    }

    return { type: 'meaning', words: englishWords };
  }

  throw new Error('Enter a kanji, kana, or English word.');
}

export async function getWordDetailsLocal(id: number): Promise<WordDetails> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('Invalid id');
  }

  const rows = await hydrate([id]);
  if (rows.length === 0) {
    throw new Error('Word not found');
  }
  const annotated = await annotateKanjiGrades(rows);
  const word = annotated[0];

  // Unique CJK characters across the word's kanji forms, in first-
  // occurrence order — matches the backend's "left-to-right" display
  // expectation.
  const seen = new Set<string>();
  const chars: string[] = [];
  for (const k of word.kanji) {
    for (const c of Array.from(k)) {
      if (IS_KANJI.test(c) && !seen.has(c)) {
        seen.add(c);
        chars.push(c);
      }
    }
  }

  const kanjiRows = chars.length > 0 ? await findKanjiByLiterals(chars) : [];
  const kanjiMap = new Map(kanjiRows.map((r) => [r.literal, r]));
  const kanjis: KanjiInfo[] = chars.map((c) => {
    const row = kanjiMap.get(c);
    return row
      ? formatKanji(row)
      : {
          literal: c,
          grade: null,
          jlpt_level: null,
          stroke_count: null,
          radical: null,
          meanings: [],
          on_readings: [],
          kun_readings: [],
        };
  });

  // Example sentences — backend matches via `contained_forms && $1::text[]`.
  // The SQLite version uses json_each over the JSON-encoded array.
  const forms = [...word.kanji, ...word.readings.map((r) => r.form)].filter(Boolean);
  let sentences: ExampleSentence[] = [];
  if (forms.length > 0) {
    const sRows = await findExampleSentences(forms, SENTENCE_LIMIT);
    sentences = sRows.map((r) => ({
      id: r.id,
      wordForm: r.word_form,
      ja: r.ja_plain,
      jaRuby: r.ja_ruby,
      en: r.en,
      gradeLabel: r.grade_label,
    }));
  }

  return { word, kanjis, sentences };
}

// ── Internal helpers (mirror searchService.js) ─────────────────────────────

type SearchKind = 'word' | 'kana';

async function japaneseWithDeinflection(
  q: string,
  kind: SearchKind,
): Promise<SearchResponse> {
  // Direct match first.
  const direct = await searchJapaneseForms([q], RESULT_LIMIT);
  if (direct.length > 0) {
    const words = await hydrateAndAnnotate(direct);
    return kind === 'word'
      ? { type: 'word', words }
      : { type: 'kana', words, names: [], kanjis: [] };
  }

  const candidates = deinflect(q);
  const forms = candidates.map((c) => c.base).filter((f) => f !== q);
  if (forms.length === 0) {
    return kind === 'word'
      ? { type: 'word', words: [] }
      : { type: 'kana', words: [], names: [], kanjis: [] };
  }

  const hits = await searchJapaneseForms(forms, RESULT_LIMIT);
  const inflectionByForm = new Map(candidates.map((c) => [c.base, c.inflections]));
  const words = await hydrateAndAnnotate(hits, (hit) => ({
    from: q,
    path: hit.form ? inflectionByForm.get(hit.form) ?? [] : [],
  }));

  return kind === 'word'
    ? { type: 'word', words }
    : { type: 'kana', words, names: [], kanjis: [] };
}

type AnnotatedWord = WordResult & {
  inflection?: { from: string; path: string[] };
};

async function hydrateAndAnnotate(
  hits: ScoredHit[],
  metaFn?: (hit: ScoredHit) => { from: string; path: string[] },
): Promise<AnnotatedWord[]> {
  if (hits.length === 0) return [];

  const seen = new Set<number>();
  const orderedIds: number[] = [];
  const metaById = new Map<number, { from: string; path: string[] }>();
  const exactSenseById = new Map<number, number>();
  for (const h of hits) {
    const key = Number(h.word_id);
    if (seen.has(key)) continue;
    seen.add(key);
    orderedIds.push(h.word_id);
    if (metaFn) metaById.set(key, metaFn(h));
    if (h.exact_sense_order != null) {
      exactSenseById.set(key, h.exact_sense_order);
    }
  }

  const hydrated = await hydrate(orderedIds);
  const annotated = await annotateKanjiGrades(hydrated);

  // Sort rules — direct port of searchService.hydrateAndAnnotate:
  //  1. Single-kanji word with exact match in senses 1–5 (earlier sense first)
  //  2. Any exact match in top-10 senses (earlier sense first)
  //  3. JLPT presence + higher level first (N5 = 5 > N1 = 1)
  //  4. Grade ascending (nulls last)
  //  5. Primary kanji length, then primary reading length
  //  6. Stable fallback preserves upstream SQL score order
  annotated.sort((a, b) => {
    const aEx = exactSenseById.get(a.id);
    const bEx = exactSenseById.get(b.id);

    const aTopKanji = aEx != null && aEx <= 5 && primaryLength(a.kanji) === 1;
    const bTopKanji = bEx != null && bEx <= 5 && primaryLength(b.kanji) === 1;
    if (aTopKanji !== bTopKanji) return aTopKanji ? -1 : 1;
    if (aTopKanji && bTopKanji && aEx !== bEx) return (aEx ?? 0) - (bEx ?? 0);

    if (aEx != null && bEx != null) {
      if (aEx !== bEx) return aEx - bEx;
    } else if (aEx != null) return -1;
    else if (bEx != null) return 1;

    const aJlpt = a.jlpt_level ?? null;
    const bJlpt = b.jlpt_level ?? null;
    if (aJlpt !== bJlpt) {
      if (aJlpt == null) return 1;
      if (bJlpt == null) return -1;
      return bJlpt - aJlpt;
    }

    if (a.grade !== b.grade) {
      if (a.grade == null) return 1;
      if (b.grade == null) return -1;
      return a.grade - b.grade;
    }
    const aKanjiLen = primaryLength(a.kanji);
    const bKanjiLen = primaryLength(b.kanji);
    if (aKanjiLen !== bKanjiLen) return aKanjiLen - bKanjiLen;
    return primaryLength(a.readings.map((r) => r.form)) -
           primaryLength(b.readings.map((r) => r.form));
  });

  return annotated.map((r) => {
    const meta = metaById.get(r.id);
    return meta ? { ...r, inflection: meta } : r;
  });
}

/**
 * Attach `grade` (min grade of the word's kanji, nulls last) and
 * `char_grades` (per-character grade list) to each hydrated word.
 * One batched lookup regardless of word count.
 */
async function annotateKanjiGrades(words: HydratedWord[]): Promise<WordResult[]> {
  const chars = new Set<string>();
  for (const w of words) {
    for (const k of w.kanji) {
      for (const c of Array.from(k)) {
        if (IS_KANJI.test(c)) chars.add(c);
      }
    }
  }

  if (chars.size === 0) {
    return words.map((w) => ({
      id: w.id,
      is_common: w.is_common,
      grade: null,
      jlpt_level: w.jlpt_level,
      char_grades: [],
      kanji: w.kanji,
      readings: w.readings,
      meanings: w.meanings,
    }));
  }

  const gradeRows = await findKanjiGradesByLiterals(Array.from(chars));
  const gradeMap = new Map(gradeRows.map((r) => [r.literal, r.grade]));

  return words.map((w) => {
    let min: number | null = null;
    const seen = new Set<string>();
    const charGrades: { char: string; grade: number | null }[] = [];
    for (const k of w.kanji) {
      for (const c of Array.from(k)) {
        if (!IS_KANJI.test(c)) continue;
        const g = gradeMap.get(c) ?? null;
        if (!seen.has(c)) {
          seen.add(c);
          charGrades.push({ char: c, grade: g });
        }
        if (g != null && (min === null || g < min)) min = g;
      }
    }
    return {
      id: w.id,
      is_common: w.is_common,
      grade: min,
      jlpt_level: w.jlpt_level,
      char_grades: charGrades,
      kanji: w.kanji,
      readings: w.readings,
      meanings: w.meanings,
    };
  });
}

// ── Formatters (kanji / name row → API shape) ──────────────────────────────

function split(value: string | null, sep: string | RegExp): string[] {
  if (!value) return [];
  return value.split(sep).map((s) => s.trim()).filter((s) => s.length > 0);
}

function formatKanji(row: KanjiRow): KanjiInfo {
  return {
    literal: row.literal,
    grade: row.grade ?? null,
    jlpt_level: row.jlpt_level ?? null,
    stroke_count: row.stroke_count,
    radical: row.radical ?? null,
    meanings: split(row.meaning, ', '),
    on_readings: split(row.on_readings, ', '),
    kun_readings: split(row.kun_readings, ', '),
  };
}

function assembleNameRow(row: NameRow): NameResult {
  return {
    id: row.id,
    kanji: row.kanji,
    kana: row.kana,
    name_type: split(row.name_type, ','),
    translations: split(row.meaning, '; '),
  };
}

// ── Misc ───────────────────────────────────────────────────────────────────

function primaryLength(arr: string[]): number {
  if (!arr || arr.length === 0) return Number.POSITIVE_INFINITY;
  return Array.from(arr[0]).length;
}
