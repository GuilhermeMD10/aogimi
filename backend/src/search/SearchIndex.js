/**
 * Abstract search index — the seam between `searchService` (policy: query
 * routing, deinflection) and the data store (mechanism: Postgres today,
 * Meilisearch / Elasticsearch tomorrow).
 *
 * Any concrete implementation must:
 *   1. Rank English meaning queries by match quality + word frequency.
 *   2. Match exact Japanese forms (kanji or kana) via indexed lookup.
 *   3. Hydrate a set of word IDs into the shared response shape in a single
 *      round trip (no N+1).
 *
 * The shape of the hydrated row is fixed (see hydrate below) so upstream
 * code never needs to care which backend produced it.
 */
class SearchIndex {
  /**
   * Rank English meaning candidates for a query.
   * @param {string} query  normalized English query (lowercased, trimmed)
   * @param {number} limit  max candidate word_ids to return
   * @returns {Promise<{ word_id: number, score: number }[]>}
   */
  async searchEnglish(_query, _limit) { throw new Error('not implemented'); }

  /**
   * Look up Japanese words whose kanji or reading matches any of the given
   * surface forms exactly. Used for the deinflection path.
   * @param {string[]} forms
   * @param {number} limit
   * @returns {Promise<{ word_id: number, form: string }[]>}
   */
  async searchJapaneseForms(_forms, _limit) { throw new Error('not implemented'); }

  /**
   * Words that contain a given kanji character in any of their kanji forms.
   * Used for the single-kanji query type.
   * @param {string} char  a single CJK character
   * @param {number} limit
   * @returns {Promise<{ word_id: number }[]>}
   */
  async searchByKanjiContaining(_char, _limit) { throw new Error('not implemented'); }

  /**
   * Fetch full word data for a set of IDs. Must preserve the input order
   * (the score-based ordering lives in the caller, not the DB).
   *
   * Returned shape matches the public API response for a single word:
   *   { id, is_common, priority_score, kanji: string[], readings: string[],
   *     meanings: { meaning, pos, lang }[] }
   *
   * @param {number[]} ids
   * @returns {Promise<object[]>}
   */
  async hydrate(_ids) { throw new Error('not implemented'); }
}

module.exports = { SearchIndex };
