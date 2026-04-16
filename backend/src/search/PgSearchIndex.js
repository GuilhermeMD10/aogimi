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
 *    +50  bonus if the matching sense is sense_order = 1
 *    +priority_score  (0–100, precomputed from JMdict priority markers)
 *    +20  is_common bonus
 *
 * The exact match bonus alone outweighs every other factor, so unambiguous
 * queries like "dog" resolve to their canonical word (犬) deterministically.
 */
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
                 + CASE WHEN wm.sense_order = 1 THEN 50 ELSE 0 END
               ) AS match_score
        FROM word_meanings wm
        WHERE wm.lang = 'eng'
          AND (
                wm.gloss_norm = $1
             OR wm.gloss_norm LIKE $1 || '%'
             OR wm.tsv @@ plainto_tsquery('english', $1)
          )
        GROUP BY wm.word_id
      )
      SELECT c.word_id,
             (c.match_score
              + COALESCE(w.priority_score, 0)
              + CASE WHEN w.is_common THEN 20 ELSE 0 END) AS score
      FROM candidates c
      JOIN words w ON w.id = c.word_id
      WHERE c.match_score > 0
      ORDER BY score DESC, w.id
      LIMIT $2
      `,
      [query, limit],
    );
    return rows.map(r => ({ word_id: r.word_id, score: r.score }));
  }

  async searchJapaneseForms(forms, limit = 20) {
    if (!forms.length) return [];
    const { rows } = await pool.query(
      `
      SELECT form, word_id
      FROM (
        SELECT wk.kanji AS form, wk.word_id,
               COALESCE(w.priority_score, 0) + CASE WHEN w.is_common THEN 20 ELSE 0 END AS score
          FROM word_kanji wk
          JOIN words w ON w.id = wk.word_id
         WHERE wk.kanji = ANY($1::text[])
        UNION
        SELECT wr.kana, wr.word_id,
               COALESCE(w.priority_score, 0) + CASE WHEN w.is_common THEN 20 ELSE 0 END
          FROM word_readings wr
          JOIN words w ON w.id = wr.word_id
         WHERE wr.kana = ANY($1::text[])
        UNION
        SELECT wf.form, wf.base_id,
               COALESCE(w.priority_score, 0) + CASE WHEN w.is_common THEN 20 ELSE 0 END
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

  async searchByKanjiContaining(char, limit = 20) {
    const { rows } = await pool.query(
      `
      SELECT DISTINCT ON (wk.word_id) wk.word_id,
             (COALESCE(w.priority_score, 0)
              + CASE WHEN w.is_common THEN 20 ELSE 0 END
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
    const { rows } = await pool.query(
      `
      SELECT w.id,
             w.is_common,
             w.priority_score,
             COALESCE(
               (SELECT json_agg(DISTINCT wk.kanji)
                FROM word_kanji wk WHERE wk.word_id = w.id),
               '[]'::json
             ) AS kanji,
             COALESCE(
               (SELECT json_agg(DISTINCT wr.kana)
                FROM word_readings wr WHERE wr.word_id = w.id),
               '[]'::json
             ) AS readings,
             COALESCE(
               (SELECT json_agg(json_build_object(
                         'meaning', wm.meaning,
                         'pos',     wm.pos,
                         'lang',    wm.lang
                       ) ORDER BY wm.sense_order NULLS LAST)
                FROM word_meanings wm
                WHERE wm.word_id = w.id AND wm.lang = 'eng'),
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
        kanji:    r.kanji    ?? [],
        readings: r.readings ?? [],
        meanings: r.meanings ?? [],
      }));
  }
}

module.exports = { PgSearchIndex };
