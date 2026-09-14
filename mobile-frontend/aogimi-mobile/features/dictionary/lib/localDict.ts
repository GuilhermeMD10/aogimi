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
  searchJapanesePrefix,
  type HydratedWord,
  type KanjiRow,
  type NameRow,
  type ScoredHit,
} from './searchIndex';

/**
 * Results per page.
 *
 * This used to be `RESULT_LIMIT` — a hard cap. Everything past the twentieth
 * match was simply dropped, and the response could not say so, so the list had
 * no way to offer the rest and the count line claimed "20" for a query with
 * four hundred matches.
 *
 * ── The probe row ──────────────────────────────────────────────────────────
 * Every capped query below asks for `limit + 1` rows and returns `limit`. The
 * row that does not fit is never rendered; its *existence* is what sets
 * `hasMore`. That makes "is there another page" a fact rather than the usual
 * `length === limit` guess, which cannot tell a full last page from a partial
 * one and leaves a "More results" button that yields nothing.
 *
 * ── Growing limit, not offset ──────────────────────────────────────────────
 * A later page re-runs the whole search with a larger `limit` instead of
 * fetching an offset slice. That is deliberate: the response is assembled from
 * several queries that are merged, de-duplicated by word id and re-sorted
 * (`hydrateAndAnnotate`, and the kana+English merge in branch 4), so row N of
 * one page is not row N of the next and `OFFSET` would silently skip and repeat
 * entries. Re-querying is also cheap — this is a local, indexed SQLite file,
 * not a network round trip.
 */
export const PAGE_SIZE = 20;

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

/**
 * One page of results for `rawQuery`.
 *
 * `limit` is the number of rows *returned per capped list*, and grows by
 * `PAGE_SIZE` for each further page the user asks for. See `PAGE_SIZE` for why
 * the limit grows rather than an offset advancing.
 */
export async function searchLocal(
  rawQuery: string,
  limit: number = PAGE_SIZE,
): Promise<SearchResponse> {
  if (!rawQuery || !rawQuery.trim()) {
    throw new Error('Query must not be empty');
  }
  const q = normalize(rawQuery);
  // One past the page: present iff a further page exists.
  const probe = limit + 1;

  // 1. Single kanji → triple-lookup (kanji table, kanji-containing words, names)
  if (isSingleKanji(q)) {
    const [kanjiRow, kanjiWordHits, nameRows] = await Promise.all([
      findKanjiByLiteral(q),
      searchByKanjiContaining(q, probe),
      findNamesByKanji(q, probe),
    ]);
    // Counted *after* hydration, not on the raw hits: `hydrateAndAnnotate`
    // de-duplicates by word id, so the probe row can vanish there and the hit
    // count would over-report.
    const words = await hydrateAndAnnotate(kanjiWordHits);
    return {
      type: 'kanji',
      kanji: kanjiRow ? formatKanji(kanjiRow) : null,
      words: words.slice(0, limit),
      names: nameRows.slice(0, limit).map(assembleNameRow),
      // Either list overflowing means there is another page to show.
      hasMore: words.length > limit || nameRows.length > limit,
    };
  }

  // 2. Kanji-containing word
  if (hasKanji(q)) {
    return japaneseWithDeinflection(q, 'word', limit);
  }

  // 3. Pure kana
  if (IS_KANA.test(q)) {
    const [kanaResult, nameRows, onKanjis, kunKanjis] = await Promise.all([
      japaneseWithDeinflection(q, 'kana', limit),
      findNamesByKana(q, probe),
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
      // Already paged by `japaneseWithDeinflection`.
      words,
      names: nameRows.slice(0, limit).map(assembleNameRow),
      // Uncapped on purpose — a reading maps to a handful of characters.
      kanjis,
      hasMore: kanaResult.hasMore || nameRows.length > limit,
    };
  }

  // 4. Romaji / English
  if (IS_ROMAJI.test(q)) {
    const englishQ = q.toLowerCase().replace(/[^\w\s-]/g, '');
    const kana = romajiToKana(q);

    const [jpResult, englishHits] = await Promise.all([
      kana ? japaneseWithDeinflection(kana, 'kana', limit) : Promise.resolve(null),
      searchEnglish(englishQ, probe),
    ]);

    const englishWords = await hydrateAndAnnotate(englishHits);

    if (jpResult && 'words' in jpResult && jpResult.words.length > 0) {
      const seenIds = new Set(jpResult.words.map((w) => w.id));
      const deduped = englishWords.filter((w) => !seenIds.has(w.id));
      const merged = [...jpResult.words, ...deduped];
      return {
        type: 'meaning',
        words: merged.slice(0, limit),
        // The merge is the reason `OFFSET` was never an option here: the kana
        // half is prepended and the English half de-duplicated against it, so
        // the boundary between pages moves. `jpResult.hasMore` still counts —
        // its own words were paged before the merge saw them.
        hasMore: merged.length > limit || jpResult.hasMore,
      };
    }

    return {
      type: 'meaning',
      words: englishWords.slice(0, limit),
      hasMore: englishWords.length > limit,
    };
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

/**
 * The word/kana shape, paged.
 *
 * Extracted because the ternary below was written out three times and now has
 * a third thing to keep in step (`hasMore`) — the slice, the overflow test and
 * the shape belong together in one place.
 *
 * `words` arrives here **unsliced**: this is what pages it, so callers hand
 * over everything hydration produced, probe row included.
 */
function pagedFrame(kind: SearchKind, words: WordResult[], limit: number): SearchResponse {
  const page = words.slice(0, limit);
  const hasMore = words.length > limit;
  return kind === 'word'
    ? { type: 'word', words: page, hasMore }
    : { type: 'kana', words: page, names: [], kanjis: [], hasMore };
}

/**
 * Exact and deinflected matches, then the partial ones.
 *
 * ── Why the two blocks are hydrated separately ─────────────────────────────
 * `hydrateAndAnnotate` re-sorts everything it is given by its own tiebreakers
 * (JLPT tier, grade, form length), which are the right rules *within* a set of
 * equally-good matches and the wrong ones *across* them: a common short word
 * that merely starts with the query would outrank the word the reader actually
 * typed. So each block is ranked on its own and the blocks are concatenated —
 * exact first, always. This is the same shape branch 4 already uses to put
 * Japanese hits ahead of English ones.
 *
 * The prefix query runs in parallel with the direct one because it does not
 * depend on the answer: partial matches are shown *alongside* an exact hit,
 * not only when there is none. Typing 食べる should still reveal 食べる方 below
 * it, which is the whole point of asking for partial results.
 */
async function japaneseWithDeinflection(
  q: string,
  kind: SearchKind,
  limit: number = PAGE_SIZE,
): Promise<SearchResponse> {
  const probe = limit + 1;

  const [direct, prefixHits] = await Promise.all([
    searchJapaneseForms([q], probe),
    searchJapanesePrefix(q, probe),
  ]);

  const exact = direct.length > 0
    ? await hydrateAndAnnotate(direct)
    : await deinflected(q, probe);

  return pagedFrame(kind, await withPartials(exact, prefixHits), limit);
}

/** The deinflection fallback: 食べた → 食べる, annotated with the path taken. */
async function deinflected(q: string, probe: number): Promise<AnnotatedWord[]> {
  const candidates = deinflect(q);
  const forms = candidates.map((c) => c.base).filter((f) => f !== q);
  if (forms.length === 0) return [];

  const hits = await searchJapaneseForms(forms, probe);
  const inflectionByForm = new Map(candidates.map((c) => [c.base, c.inflections]));
  return hydrateAndAnnotate(hits, (hit) => ({
    from: q,
    path: hit.form ? inflectionByForm.get(hit.form) ?? [] : [],
  }));
}

/**
 * `exact` followed by the partial matches it does not already contain.
 *
 * De-duplicated by word id against the exact block, so a word matched both
 * ways keeps its higher position rather than appearing twice. Returns the
 * merged list **unsliced** — `pagedFrame` owns the page boundary, and it needs
 * the probe row to know whether another page exists.
 */
async function withPartials(
  exact: AnnotatedWord[],
  prefixHits: ScoredHit[],
): Promise<AnnotatedWord[]> {
  if (prefixHits.length === 0) return exact;
  const seen = new Set(exact.map((w) => w.id));
  const partial = (await hydrateAndAnnotate(prefixHits, undefined, true))
    .filter((w) => !seen.has(w.id));
  return [...exact, ...partial];
}

type AnnotatedWord = WordResult & {
  inflection?: { from: string; path: string[] };
};

/**
 * `keepOrder` leaves the caller's ranking alone instead of applying the
 * tiebreakers below.
 *
 * The tiebreakers answer "which of these equally-exact matches did the reader
 * most likely mean" — JLPT tier, school grade, shortest form. That is the
 * wrong question for the partial block, and asking it there breaks paging:
 * the sort runs over however many candidates this page fetched, so a longer
 * page can rank a newly-arrived row *above* one already on screen, and
 * pressing "More results" reshuffles rows the reader was looking at instead
 * of just adding to them. Left in SQL order the block is a growing prefix —
 * page two always starts with page one — and the SQL score (priority, common,
 * JLPT, minus form length) is already a total order over exactly the rows
 * being ranked.
 */
async function hydrateAndAnnotate(
  hits: ScoredHit[],
  metaFn?: (hit: ScoredHit) => { from: string; path: string[] },
  keepOrder = false,
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

  if (!keepOrder) sortByMatchQuality(annotated, exactSenseById);

  return annotated.map((r) => {
    const meta = metaById.get(r.id);
    return meta ? { ...r, inflection: meta } : r;
  });
}

/**
 * The tiebreaker sort, in place. See `hydrateAndAnnotate`'s `keepOrder`.
 *
 * Sort rules — direct port of searchService.sortByMatchQuality:
 *  1. Single-kanji word with exact match in senses 1–5 (earlier sense first)
 *  2. Any exact match in top-10 senses (earlier sense first)
 *  3. JLPT presence + higher level first (N5 = 5 > N1 = 1)
 *  4. Grade ascending (nulls last)
 *  5. Primary kanji length, then primary reading length
 *  6. Stable fallback preserves upstream SQL score order
 */
function sortByMatchQuality(
  annotated: AnnotatedWord[],
  exactSenseById: Map<number, number>,
): void {
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
