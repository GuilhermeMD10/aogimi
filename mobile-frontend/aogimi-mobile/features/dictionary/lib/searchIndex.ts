// SQLite port of backend/src/search/PgSearchIndex.js.
//
// Same ranking formula and tiebreakers — the two must agree so users
// get identical results online and offline. Differences from the
// Postgres version:
//
//   - FTS via SQLite's FTS5 virtual table `word_meanings_fts` instead
//     of Postgres' `tsvector` + GIN. Tokenizer is Porter + unicode61
//     (built in the bundled dictionary; see helpers/files/build_sqlite_dict.js).
//
//   - `ANY($1::text[])` is rewritten as `IN (?, ?, ...)` with the
//     placeholders generated dynamically.
//
//   - `position($1 in wk.kanji)` becomes `instr(wk.kanji, ?)`.
//
//   - The Postgres `json_agg` / `json_build_object` aggregation in
//     `hydrate` is replaced with a small multi-query pipeline (one
//     SELECT per child table). The aggregation lives in JS so the
//     ordering rules in PgSearchIndex.hydrate (priority-weighted kanji
//     and reading sort) can be applied here too.

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDictionary } from './openDictionary';

// ── Scored row shapes (return values) ──────────────────────────────────────

export type ScoredHit = {
  word_id: number;
  score?: number;
  exact_sense_order?: number | null;
  /** When the match came through `searchJapaneseForms`, the form that
   *  matched (used to attach inflection metadata in the router). */
  form?: string;
};

export type HydratedWord = {
  id: number;
  is_common: boolean;
  priority_score: number;
  jlpt_level: number | null;
  kanji: string[];
  readings: { form: string; pitchAccents: string | null }[];
  meanings: { meaning: string; pos: string | null; lang: string }[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

function placeholders(n: number): string {
  return new Array(n).fill('?').join(',');
}

/**
 * Sanitize a user query for FTS5. Tokens are extracted as alphanumerics
 * and rejoined with spaces (default FTS5 AND semantics). Empty string
 * means the FTS path should be skipped — callers should branch on that.
 */
function sanitizeFts(q: string): string {
  const tokens = q.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return tokens.join(' ');
}

/**
 * JMdict priority marker → numeric score. Matches the KANJI_SCORE /
 * KANA_SCORE formulas in PgSearchIndex.hydrate. Kept in JS rather than
 * SQL because SQLite has no native regex and the Postgres formula
 * relies on `~ 'nf0[1-5]'`-style matches.
 */
function priorityScore(priority: string | null): number {
  if (!priority) return 0;
  let score = 0;
  if (priority.includes('ichi1')) score += 50;
  if (priority.includes('news1')) score += 40;
  if (priority.includes('gai1'))  score += 30;
  if (priority.includes('spec1')) score += 20;
  // nf01–nf05 → 20, nf06–nf12 → 10, nf13–nf24 → 5
  const nfMatch = priority.match(/nf(\d{2})/);
  if (nfMatch) {
    const n = parseInt(nfMatch[1], 10);
    if (n >= 1 && n <= 5) score += 20;
    else if (n >= 6 && n <= 12) score += 10;
    else if (n >= 13 && n <= 24) score += 5;
  }
  return score;
}

// ── Search paths (mirror PgSearchIndex's methods) ──────────────────────────

/**
 * English meaning search. Scoring:
 *   1000  gloss_norm = query
 *    600  gloss_norm starts with "query "
 *    300  gloss_norm starts with "query"
 *    100  FTS5 match
 *   +5–50 sense_order gradient (sense 1 → +50, ... sense 10 → +5)
 *   +priority_score, +is_common (20), +JLPT (50 + level*5)
 */
export async function searchEnglish(query: string, limit = 20): Promise<ScoredHit[]> {
  const db = await getDictionary();
  const ftsQuery = sanitizeFts(query);

  // Query is built as a UNION of three small indexed sub-queries
  // that produce candidate `word_meanings.id`s:
  //   1. Exact match on `gloss_norm`         — uses idx_wm_gloss_norm_eng
  //   2. Prefix match via GLOB               — uses idx_wm_gloss_norm_eng
  //   3. FTS5 MATCH on word_meanings_fts     — uses the FTS index
  //
  // Joining `word_meanings` against the materialized candidate set is
  // far cheaper than scanning `word_meanings` with an OR'd WHERE that
  // contains a correlated FTS subquery (the original shape). GLOB also
  // replaces LIKE so SQLite can use the B-tree index — LIKE is
  // case-insensitive by default and won't use an index without a
  // PRAGMA we'd rather not flip.
  //
  // Skip the FTS arm entirely when the sanitised query is empty (a
  // pure-symbol input). MATCH with an empty pattern raises an error.
  const ftsArm = ftsQuery.length > 0
    ? `UNION SELECT rowid AS id FROM word_meanings_fts WHERE word_meanings_fts MATCH :fts`
    : '';

  const rows = await db.getAllAsync<{
    word_id: number;
    exact_sense_order: number | null;
    score: number;
  }>(
    `
    WITH candidate_ids AS (
      SELECT id FROM word_meanings
        WHERE lang = 'eng' AND gloss_norm = :q
          AND (sense_order IS NULL OR sense_order <= 10)
      UNION
      SELECT id FROM word_meanings
        WHERE lang = 'eng' AND gloss_norm GLOB :pf
          AND (sense_order IS NULL OR sense_order <= 10)
      ${ftsArm}
    ),
    candidates AS (
      SELECT wm.word_id,
             MAX(
               CASE
                 WHEN wm.gloss_norm = :q             THEN 1000
                 WHEN wm.gloss_norm GLOB :pf_space   THEN  600
                 WHEN wm.gloss_norm GLOB :pf         THEN  300
                 ELSE                                       100
               END
               + MAX(0, 11 - COALESCE(wm.sense_order, 10)) * 5
             ) AS match_score,
             MIN(CASE WHEN wm.gloss_norm = :q THEN wm.sense_order END)
               AS exact_sense_order
      FROM word_meanings wm
      JOIN candidate_ids ci ON ci.id = wm.id
      WHERE wm.lang = 'eng'
        AND (wm.sense_order IS NULL OR wm.sense_order <= 10)
      GROUP BY wm.word_id
    )
    SELECT c.word_id,
           c.exact_sense_order,
           (c.match_score
            + COALESCE(w.priority_score, 0)
            + CASE WHEN w.is_common = 1 THEN 20 ELSE 0 END
            + CASE WHEN w.jlpt_level IS NOT NULL THEN 50 + w.jlpt_level * 5 ELSE 0 END) AS score
    FROM candidates c
    JOIN words w ON w.id = c.word_id
    ORDER BY score DESC, w.id
    LIMIT :lim
    `,
    {
      ':q': query,
      ':pf': `${query}*`,
      ':pf_space': `${query} *`,
      ':fts': ftsQuery,
      ':lim': limit,
    },
  );

  return rows.map((r) => ({
    word_id: r.word_id,
    score: r.score,
    exact_sense_order: r.exact_sense_order,
  }));
}

/**
 * Japanese form search. Looks the surface forms up in word_kanji,
 * word_readings, and word_forms (the deinflection table) at once.
 * Returns one hit per (form, word_id) pair, ranked by priority +
 * is_common + JLPT.
 */
export async function searchJapaneseForms(
  forms: string[],
  limit = 20,
): Promise<ScoredHit[]> {
  if (forms.length === 0) return [];
  const db = await getDictionary();
  const ph = placeholders(forms.length);

  // SQLite needs three positional bindings of `forms` (one per UNION
  // arm). Expand the params accordingly.
  const params = [...forms, ...forms, ...forms, limit];

  const rows = await db.getAllAsync<{
    form: string;
    word_id: number;
    score: number;
  }>(
    `
    SELECT form, word_id, score FROM (
      SELECT wk.kanji AS form, wk.word_id,
             COALESCE(w.priority_score, 0)
               + CASE WHEN w.is_common = 1 THEN 20 ELSE 0 END
               + CASE WHEN w.jlpt_level IS NOT NULL THEN 50 + w.jlpt_level * 5 ELSE 0 END AS score
        FROM word_kanji wk
        JOIN words w ON w.id = wk.word_id
       WHERE wk.kanji IN (${ph})
      UNION
      SELECT wr.kana AS form, wr.word_id,
             COALESCE(w.priority_score, 0)
               + CASE WHEN w.is_common = 1 THEN 20 ELSE 0 END
               + CASE WHEN w.jlpt_level IS NOT NULL THEN 50 + w.jlpt_level * 5 ELSE 0 END AS score
        FROM word_readings wr
        JOIN words w ON w.id = wr.word_id
       WHERE wr.kana IN (${ph})
      UNION
      SELECT wf.form, wf.base_id AS word_id,
             COALESCE(w.priority_score, 0)
               + CASE WHEN w.is_common = 1 THEN 20 ELSE 0 END
               + CASE WHEN w.jlpt_level IS NOT NULL THEN 50 + w.jlpt_level * 5 ELSE 0 END AS score
        FROM word_forms wf
        JOIN words w ON w.id = wf.base_id
       WHERE wf.form IN (${ph})
    ) matches
    ORDER BY score DESC, word_id
    LIMIT ?
    `,
    params,
  );

  return rows.map((r) => ({ word_id: r.word_id, form: r.form }));
}

/**
 * Words containing a given kanji character. Used for the
 * single-kanji search dispatch path. Prefers shorter kanji forms
 * (more canonical) via a length penalty.
 */
export async function searchByKanjiContaining(
  char: string,
  limit = 20,
): Promise<ScoredHit[]> {
  const db = await getDictionary();
  const rows = await db.getAllAsync<{ word_id: number; score: number }>(
    `
    SELECT wk.word_id,
           MAX(
             COALESCE(w.priority_score, 0)
             + CASE WHEN w.is_common = 1 THEN 20 ELSE 0 END
             + CASE WHEN w.jlpt_level IS NOT NULL THEN 50 + w.jlpt_level * 5 ELSE 0 END
             - length(wk.kanji)
           ) AS score
    FROM word_kanji wk
    JOIN words w ON w.id = wk.word_id
    WHERE instr(wk.kanji, ?) > 0
    GROUP BY wk.word_id
    ORDER BY score DESC, wk.word_id
    LIMIT ?
    `,
    [char, limit],
  );

  return rows.map((r) => ({ word_id: r.word_id }));
}

// ── Hydrate ────────────────────────────────────────────────────────────────

/**
 * Hydrate a list of scored word ids into full word records. Returns
 * rows in caller-supplied order so the score ranking is preserved.
 *
 * Pipeline:
 *   1. SELECT base word rows.
 *   2. SELECT child rows (kanji, readings, meanings) keyed by word_id.
 *   3. Group child rows in JS and sort kanji/readings by priority
 *      score (deduplicating identical forms — same as Postgres' inner
 *      GROUP BY).
 */
export async function hydrate(ids: number[]): Promise<HydratedWord[]> {
  if (ids.length === 0) return [];
  const db = await getDictionary();
  const ph = placeholders(ids.length);

  const [wordRows, kanjiRows, readingRows, meaningRows] = await Promise.all([
    db.getAllAsync<{
      id: number;
      is_common: number;
      priority_score: number;
      jlpt_level: number | null;
    }>(
      `SELECT id, is_common, priority_score, jlpt_level FROM words WHERE id IN (${ph})`,
      ids,
    ),
    db.getAllAsync<{ word_id: number; kanji: string; priority: string | null }>(
      `SELECT word_id, kanji, priority FROM word_kanji WHERE word_id IN (${ph})`,
      ids,
    ),
    db.getAllAsync<{
      word_id: number;
      kana: string;
      priority: string | null;
      pitch_accents: string | null;
    }>(
      `SELECT word_id, kana, priority, pitch_accents FROM word_readings WHERE word_id IN (${ph})`,
      ids,
    ),
    db.getAllAsync<{
      word_id: number;
      meaning: string;
      pos: string | null;
      lang: string;
      sense_order: number | null;
    }>(
      `SELECT word_id, meaning, pos, lang, sense_order FROM word_meanings
       WHERE word_id IN (${ph}) AND lang = 'eng'
         AND (sense_order IS NULL OR sense_order <= 10)`,
      ids,
    ),
  ]);

  // Group + sort kanji per word. The Postgres query MAX(priority) per
  // unique form to dedupe; mirror that with a Map.
  const kanjiByWord = new Map<number, Map<string, number>>();
  for (const k of kanjiRows) {
    let inner = kanjiByWord.get(k.word_id);
    if (!inner) {
      inner = new Map();
      kanjiByWord.set(k.word_id, inner);
    }
    const score = priorityScore(k.priority);
    if (!inner.has(k.kanji) || (inner.get(k.kanji) ?? 0) < score) {
      inner.set(k.kanji, score);
    }
  }
  const kanjiArrFor = (id: number): string[] => {
    const m = kanjiByWord.get(id);
    if (!m) return [];
    return Array.from(m.entries())
      .sort(([a, sa], [b, sb]) => (sb - sa) || a.localeCompare(b))
      .map(([form]) => form);
  };

  // Same for readings, but preserve pitch_accents on the chosen entry.
  const readingByWord = new Map<
    number,
    Map<string, { score: number; pitchAccents: string | null }>
  >();
  for (const r of readingRows) {
    let inner = readingByWord.get(r.word_id);
    if (!inner) {
      inner = new Map();
      readingByWord.set(r.word_id, inner);
    }
    const score = priorityScore(r.priority);
    const existing = inner.get(r.kana);
    if (!existing || existing.score < score) {
      inner.set(r.kana, { score, pitchAccents: r.pitch_accents });
    }
  }
  const readingsArrFor = (id: number): HydratedWord['readings'] => {
    const m = readingByWord.get(id);
    if (!m) return [];
    return Array.from(m.entries())
      .sort(([a, sa], [b, sb]) => (sb.score - sa.score) || a.localeCompare(b))
      .map(([form, info]) => ({ form, pitchAccents: info.pitchAccents }));
  };

  // Meanings ordered by sense_order (nulls last — match Postgres' NULLS LAST).
  const meaningsByWord = new Map<number, HydratedWord['meanings']>();
  for (const m of meaningRows.sort((a, b) => {
    const ao = a.sense_order ?? Number.POSITIVE_INFINITY;
    const bo = b.sense_order ?? Number.POSITIVE_INFINITY;
    return ao - bo;
  })) {
    let list = meaningsByWord.get(m.word_id);
    if (!list) {
      list = [];
      meaningsByWord.set(m.word_id, list);
    }
    list.push({ meaning: m.meaning, pos: m.pos, lang: m.lang });
  }

  // Preserve the caller-supplied id ordering.
  const byId = new Map(wordRows.map((w) => [w.id, w]));
  const result: HydratedWord[] = [];
  for (const id of ids) {
    const w = byId.get(id);
    if (!w) continue;
    result.push({
      id: w.id,
      is_common: !!w.is_common,
      priority_score: w.priority_score ?? 0,
      jlpt_level: w.jlpt_level,
      kanji: kanjiArrFor(id),
      readings: readingsArrFor(id),
      meanings: meaningsByWord.get(id) ?? [],
    });
  }
  return result;
}

// ── Kanji / name lookups (kanjiRepo / nameRepo equivalents) ────────────────

export type KanjiRow = {
  literal: string;
  grade: number | null;
  jlpt_level: number | null;
  stroke_count: number | null;
  radical: number | null;
  meaning: string | null;
  on_readings: string | null;
  kun_readings: string | null;
};

export async function findKanjiByLiteral(literal: string): Promise<KanjiRow | null> {
  const db = await getDictionary();
  return (
    (await db.getFirstAsync<KanjiRow>(
      `SELECT literal, grade, jlpt_level, stroke_count, radical, meaning,
              on_readings, kun_readings
         FROM kanji
        WHERE literal = ?`,
      [literal],
    )) ?? null
  );
}

export async function findKanjiByLiterals(literals: string[]): Promise<KanjiRow[]> {
  if (literals.length === 0) return [];
  const db = await getDictionary();
  return db.getAllAsync<KanjiRow>(
    `SELECT literal, grade, jlpt_level, stroke_count, radical, meaning,
            on_readings, kun_readings
       FROM kanji
      WHERE literal IN (${placeholders(literals.length)})`,
    literals,
  );
}

export async function findKanjiGradesByLiterals(
  literals: string[],
): Promise<{ literal: string; grade: number | null }[]> {
  if (literals.length === 0) return [];
  const db = await getDictionary();
  return db.getAllAsync<{ literal: string; grade: number | null }>(
    `SELECT literal, grade FROM kanji WHERE literal IN (${placeholders(literals.length)})`,
    literals,
  );
}

export async function findKanjiByOnReading(reading: string): Promise<KanjiRow[]> {
  const db = await getDictionary();
  // `on_readings` is a comma-separated list. Match either exact or as
  // a token inside the list. Postgres equivalent does the same.
  return db.getAllAsync<KanjiRow>(
    `SELECT literal, grade, jlpt_level, stroke_count, radical, meaning,
            on_readings, kun_readings
       FROM kanji
      WHERE on_readings = ?
         OR on_readings LIKE ? OR on_readings LIKE ? OR on_readings LIKE ?`,
    [reading, `${reading},%`, `%, ${reading},%`, `%, ${reading}`],
  );
}

export async function findKanjiByKunReading(reading: string): Promise<KanjiRow[]> {
  const db = await getDictionary();
  return db.getAllAsync<KanjiRow>(
    `SELECT literal, grade, jlpt_level, stroke_count, radical, meaning,
            on_readings, kun_readings
       FROM kanji
      WHERE kun_readings = ?
         OR kun_readings LIKE ? OR kun_readings LIKE ? OR kun_readings LIKE ?`,
    [reading, `${reading},%`, `%, ${reading},%`, `%, ${reading}`],
  );
}

export type NameRow = {
  id: number;
  kanji: string | null;
  kana: string;
  name_type: string | null;
  meaning: string | null;
};

export async function findNamesByKanji(kanji: string): Promise<NameRow[]> {
  const db = await getDictionary();
  return db.getAllAsync<NameRow>(
    `SELECT id, kanji, kana, name_type, meaning FROM names WHERE kanji = ? LIMIT 20`,
    [kanji],
  );
}

export async function findNamesByKana(kana: string): Promise<NameRow[]> {
  const db = await getDictionary();
  return db.getAllAsync<NameRow>(
    `SELECT id, kanji, kana, name_type, meaning FROM names WHERE kana = ? LIMIT 20`,
    [kana],
  );
}

// ── Example sentences ──────────────────────────────────────────────────────

export type ExampleSentenceRow = {
  id: number;
  word_form: string;
  ja_plain: string;
  ja_ruby: string | null;
  en: string;
  grade_label: string | null;
};

/**
 * Fetch up to `limit` curated example sentences that contain any of the
 * given forms. The Postgres version uses an indexed array-overlap on
 * `contained_forms`; SQLite stores that array as a JSON-encoded string,
 * so we use json_each to expand and match. Tiny table — performance
 * is fine without an index.
 */
export async function findExampleSentences(
  forms: string[],
  limit = 5,
): Promise<ExampleSentenceRow[]> {
  if (forms.length === 0) return [];
  const db = await getDictionary();
  const ph = placeholders(forms.length);
  return db.getAllAsync<ExampleSentenceRow>(
    `
    SELECT es.id, es.word_form, es.ja_plain, es.ja_ruby, es.en, es.grade_label
      FROM example_sentences es
     WHERE EXISTS (
       SELECT 1 FROM json_each(es.contained_forms) j
        WHERE j.value IN (${ph})
     )
        OR es.word_form IN (${ph})
     ORDER BY es.id
     LIMIT ?
    `,
    [...forms, ...forms, limit],
  );
}

// Re-export the db getter for callers that need raw access (rare).
export async function getDb(): Promise<SQLiteDatabase> {
  return getDictionary();
}
