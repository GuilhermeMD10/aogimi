const pool = require('../db');
const { SearchIndex } = require('./SearchIndex');

/**
 * Postgres-backed search index. All queries are indexed and bounded by LIMIT;
 * no method scans a whole table or loads entire joined fan-outs into memory.
 *
 * Scoring (English meaning queries):
 *   1000  exact primary-gloss match             (gloss_norm = $1)
 *    600  primary gloss starts with "$1 "       ("dog " in "dog food")
 *    300  primary gloss starts with $1          ("dog" in "doggedly")
 *    100  FTS match on any gloss in the sense   (`tsv @@ plainto_tsquery`)
 *   +5–50  sense_order gradient (sense 1 → +50, sense 2 → +45, … sense 10 → +5)
 *    +priority_score  (0–100, precomputed from JMdict priority markers)
 *    +20  is_common bonus
 *    +50 + jlpt_level*5  JLPT tier boost (N1 → +55, N5 → +75; non-JLPT → 0)
 *
 * Senses ranked 11+ are ignored entirely — only the first 10 meanings of a
 * word count toward a match. The sense_order gradient (max 45 spread) stays
 * within tier gaps, so a lower-tier match never overtakes a higher-tier one.
 *
 * The exact match bonus alone outweighs every other factor, so unambiguous
 * queries like "dog" resolve to their canonical word (犬) deterministically.
 *
 * The JLPT boost is large enough to surface JLPT entries above non-JLPT in
 * tied-relevance situations, but stays well below the exact-match tier so a
 * non-JLPT word that *exactly* matches a query still wins over a JLPT word
 * that only matches via FTS.
 */
// JLPT scoring contribution shared by all three search paths. Kept here so
// the boost stays consistent — change once, all queries follow.
const JLPT_BOOST_SQL =
  "CASE WHEN w.jlpt_level IS NOT NULL THEN 50 + w.jlpt_level * 5 ELSE 0 END";

/**
 * The shortest query worth prefix-matching, in code points.
 *
 * A one-character prefix matches a large fraction of the dictionary — every
 * reading that starts with あ — which is neither a useful answer nor a cheap
 * one, since the index range scan would then have to sort most of
 * `word_readings` by score. Single characters are also the case the other
 * paths already answer well: a lone kanji routes to `searchByKanjiContaining`
 * before it ever reaches here, and a lone kana to the on/kun reading lookups.
 *
 * Mirrored in the SQLite port's `searchIndex.ts`; the two engines must agree.
 */
const MIN_PREFIX_CHARS = 2;

/**
 * Characters that would make a prefix query mean something other than itself.
 *
 * This is the **union of both engines' pattern metacharacters** — Postgres
 * LIKE reads `% _ \`, SQLite GLOB reads `* ? [ ]` — deliberately, so a query
 * is either prefix-searched by both engines or by neither. Splitting the sets
 * would let the same input take the fast path online and the empty path
 * offline, which is exactly the online/offline divergence the two
 * implementations exist to keep aligned.
 *
 * In practice callers only reach the prefix path with kanji or kana, so this
 * never fires. It is here so that stays true by construction rather than by
 * the routing in `searchService` happening to hold.
 */
const PATTERN_META = /[*?[\]%_\\]/;

/** Whether `q` can be prefix-searched at all. Same predicate in both engines. */
function canPrefixSearch(q) {
  return Array.from(q).length >= MIN_PREFIX_CHARS && !PATTERN_META.test(q);
}

class PgSearchIndex extends SearchIndex {
  async searchEnglish(query, limit = 20) {
    const { rows } = await pool.query(
      `
      WITH candidates AS (
        SELECT wm.word_id,
               MAX(
                 CASE
                   WHEN wm.gloss_norm = $1                THEN 1000
                   WHEN wm.gloss_norm LIKE $1 || ' %'     THEN  600
                   WHEN wm.gloss_norm LIKE $1 || '%'      THEN  300
                   WHEN wm.tsv @@ plainto_tsquery('english', $1)
                                                          THEN  100
                   ELSE 0
                 END
                 + GREATEST(11 - COALESCE(wm.sense_order, 10), 0) * 5
               ) AS match_score,
               -- Earliest sense (1-based) whose primary gloss equals the
               -- query verbatim, else NULL. Used in JS as the top-priority
               -- sort key: a sense-1 exact match outranks any non-exact hit.
               MIN(CASE WHEN wm.gloss_norm = $1 THEN wm.sense_order END)
                 AS exact_sense_order
        FROM word_meanings wm
        WHERE wm.lang = 'eng'
          AND (wm.sense_order IS NULL OR wm.sense_order <= 10)
          AND (
                wm.gloss_norm = $1
             OR wm.gloss_norm LIKE $1 || '%'
             OR wm.tsv @@ plainto_tsquery('english', $1)
          )
        GROUP BY wm.word_id
      )
      SELECT c.word_id,
             c.exact_sense_order,
             (c.match_score
              + COALESCE(w.priority_score, 0)
              + CASE WHEN w.is_common THEN 20 ELSE 0 END
              + ${JLPT_BOOST_SQL}) AS score
      FROM candidates c
      JOIN words w ON w.id = c.word_id
      WHERE c.match_score > 0
      ORDER BY score DESC, w.id
      LIMIT $2
      `,
      [query, limit],
    );
    return rows.map(r => ({
      word_id: r.word_id,
      score: r.score,
      exact_sense_order: r.exact_sense_order,
    }));
  }

  async searchJapaneseForms(forms, limit = 20) {
    if (!forms.length) return [];
    const { rows } = await pool.query(
      `
      SELECT form, word_id
      FROM (
        SELECT wk.kanji AS form, wk.word_id,
               COALESCE(w.priority_score, 0)
                 + CASE WHEN w.is_common THEN 20 ELSE 0 END
                 + ${JLPT_BOOST_SQL} AS score
          FROM word_kanji wk
          JOIN words w ON w.id = wk.word_id
         WHERE wk.kanji = ANY($1::text[])
        UNION
        SELECT wr.kana, wr.word_id,
               COALESCE(w.priority_score, 0)
                 + CASE WHEN w.is_common THEN 20 ELSE 0 END
                 + ${JLPT_BOOST_SQL}
          FROM word_readings wr
          JOIN words w ON w.id = wr.word_id
         WHERE wr.kana = ANY($1::text[])
        UNION
        SELECT wf.form, wf.base_id,
               COALESCE(w.priority_score, 0)
                 + CASE WHEN w.is_common THEN 20 ELSE 0 END
                 + ${JLPT_BOOST_SQL}
          FROM word_forms wf
          JOIN words w ON w.id = wf.base_id
         WHERE wf.form = ANY($1::text[])
      ) matches
      ORDER BY score DESC, word_id
      LIMIT $2
      `,
      [forms, limit],
    );
    return rows.map(r => ({ word_id: r.word_id, form: r.form }));
  }

  /**
   * Words whose kanji form or kana reading **starts with** `q` without being
   * `q` — the partial matches, in other words: 食べ turns up 食べ物 and 食べ方
   * beside the exact 食べる.
   *
   * Two arms, not the three `searchJapaneseForms` uses. `word_forms` (the
   * inflected surfaces) is left out on purpose: a prefix of an inflection is
   * not a word the reader asked about, and every base it could reach is
   * already reached by the exact and deinflected passes that run before this
   * one.
   *
   * **Needs the `text_pattern_ops` indexes from migration 030.** Under any
   * collation but C, a default B-tree cannot answer `LIKE 'prefix%'`, and
   * without those operator-class indexes this degrades to a sequential scan of
   * `word_kanji` and `word_readings` on every keystroke. Equality is excluded
   * in SQL rather than in the caller so the LIMIT budget is spent entirely on
   * rows the caller has not already seen.
   *
   * The length penalty is `searchByKanjiContaining`'s, and means the same
   * thing: of two forms that both start with the query, the shorter one is the
   * closer answer.
   */
  async searchJapanesePrefix(q, limit = 20) {
    if (!canPrefixSearch(q)) return [];
    const { rows } = await pool.query(
      `
      SELECT form, word_id
      FROM (
        SELECT wk.kanji AS form, wk.word_id,
               COALESCE(w.priority_score, 0)
                 + CASE WHEN w.is_common THEN 20 ELSE 0 END
                 + ${JLPT_BOOST_SQL}
                 - length(wk.kanji) AS score
          FROM word_kanji wk
          JOIN words w ON w.id = wk.word_id
         WHERE wk.kanji LIKE $1 || '%' AND wk.kanji <> $1
        UNION
        SELECT wr.kana, wr.word_id,
               COALESCE(w.priority_score, 0)
                 + CASE WHEN w.is_common THEN 20 ELSE 0 END
                 + ${JLPT_BOOST_SQL}
                 - length(wr.kana)
          FROM word_readings wr
          JOIN words w ON w.id = wr.word_id
         WHERE wr.kana LIKE $1 || '%' AND wr.kana <> $1
      ) matches
      ORDER BY score DESC, word_id
      LIMIT $2
      `,
      [q, limit],
    );
    return rows.map(r => ({ word_id: r.word_id, form: r.form }));
  }

  async searchByKanjiContaining(char, limit = 20) {
    const { rows } = await pool.query(
      `
      SELECT DISTINCT ON (wk.word_id) wk.word_id,
             (COALESCE(w.priority_score, 0)
              + CASE WHEN w.is_common THEN 20 ELSE 0 END
              + ${JLPT_BOOST_SQL}
              -- Prefer shorter kanji forms (more canonical uses of the character).
              - length(wk.kanji)) AS score
      FROM word_kanji wk
      JOIN words w ON w.id = wk.word_id
      WHERE position($1 in wk.kanji) > 0
      ORDER BY wk.word_id, score DESC
      `,
      [char],
    );
    // Re-sort by score since DISTINCT ON required ordering by word_id first.
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, limit).map(r => ({ word_id: r.word_id }));
  }

  async hydrate(ids) {
    if (!ids.length) return [];
    // Per-form priority scoring inside json_agg ORDER BY ensures kanji[0]
    // and readings[0] are the canonical forms (e.g. 言う over 云う, even when
    // both are stored against the same word_id). Weights match migration
    // 008's word-level scoring so both paths agree on what "common" means.
    const KANJI_SCORE = `
      (CASE WHEN wk.priority LIKE '%ichi1%' THEN 50 ELSE 0 END
     + CASE WHEN wk.priority LIKE '%news1%' THEN 40 ELSE 0 END
     + CASE WHEN wk.priority LIKE '%gai1%'  THEN 30 ELSE 0 END
     + CASE WHEN wk.priority LIKE '%spec1%' THEN 20 ELSE 0 END
     + CASE
         WHEN wk.priority ~ 'nf0[1-5]([^0-9]|$)'          THEN 20
         WHEN wk.priority ~ 'nf(0[6-9]|1[0-2])([^0-9]|$)' THEN 10
         WHEN wk.priority ~ 'nf(1[3-9]|2[0-4])([^0-9]|$)' THEN 5
         ELSE 0
       END)`;
    const KANA_SCORE = KANJI_SCORE.replace(/wk\.priority/g, 'wr.priority');

    const { rows } = await pool.query(
      `
      SELECT w.id,
             w.is_common,
             w.priority_score,
             w.jlpt_level,
             COALESCE(
               (SELECT json_agg(k.kanji ORDER BY k.score DESC, k.kanji)
                FROM (
                  SELECT wk.kanji, MAX(${KANJI_SCORE}) AS score
                  FROM word_kanji wk
                  WHERE wk.word_id = w.id
                  GROUP BY wk.kanji
                ) k),
               '[]'::json
             ) AS kanji,
             COALESCE(
               (SELECT json_agg(
                         json_build_object(
                           'form',         r.kana,
                           'pitchAccents', r.pitch_accents
                         )
                         ORDER BY r.score DESC, r.kana
                       )
                FROM (
                  SELECT wr.kana,
                         MAX(${KANA_SCORE}) AS score,
                         MAX(wr.pitch_accents) AS pitch_accents
                  FROM word_readings wr
                  WHERE wr.word_id = w.id
                  GROUP BY wr.kana
                ) r),
               '[]'::json
             ) AS readings,
             COALESCE(
               (SELECT json_agg(val ORDER BY ord NULLS LAST)
                FROM (
                  SELECT json_build_object(
                           'meaning', wm.meaning,
                           'pos',     wm.pos,
                           'lang',    wm.lang
                         ) AS val,
                         wm.sense_order AS ord
                  FROM word_meanings wm
                  WHERE wm.word_id = w.id AND wm.lang = 'eng'
                    AND (wm.sense_order IS NULL OR wm.sense_order <= 10)
                ) s),
               '[]'::json
             ) AS meanings
      FROM words w
      WHERE w.id = ANY($1::bigint[])
      `,
      [ids],
    );

    // Preserve caller-supplied id order (score ranking lives in JS).
    const byId = new Map(rows.map(r => [Number(r.id), r]));
    return ids
      .map(id => byId.get(Number(id)))
      .filter(Boolean)
      .map(r => ({
        id: Number(r.id),
        is_common: !!r.is_common,
        priority_score: r.priority_score ?? 0,
        jlpt_level: r.jlpt_level ?? null,
        kanji:    r.kanji    ?? [],
        readings: r.readings ?? [],
        meanings: r.meanings ?? [],
      }));
  }
}

module.exports = { PgSearchIndex };
