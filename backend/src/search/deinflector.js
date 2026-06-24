/**
 * Japanese verb / adjective deinflector.
 *
 * Given an inflected surface form (e.g. 食べた, 行きません, 早かった), produces
 * a list of candidate base forms to look up in the dictionary. The lookup
 * itself happens in the search index — this module only transforms strings.
 *
 * Design:
 *   - Rules are suffix rewrites. Each rule says "if the form ends in X,
 *     stripping X and appending Y is a valid candidate, tagged with the
 *     inflection name".
 *   - Rules are applied iteratively: a single form like 食べさせられなかった
 *     unwinds through causative → passive → negative → past in multiple
 *     steps, so we BFS candidates until no more rules apply.
 *   - We return every candidate seen (including the original) so ambiguous
 *     forms like 来た (past of 来る) and 北 (noun) both get a chance to match
 *     something in the DB.
 *
 * Coverage (common inflections; not exhaustive):
 *   - Polite       -masu / -masen / -mashita / -masendeshita
 *   - Past         -ta / -da (with v5 euphonic variants)
 *   - Te-form      -te / -de (with v5 euphonic variants)
 *   - Negative     -nai / -nakatta
 *   - Potential    -reru / -rareru
 *   - Passive      -reru / -rareru
 *   - Causative    -seru / -saseru
 *   - Volitional   -ou / -you
 *   - Conditional  -tara / -dara / -ba
 *   - Desire       -tai / -takatta / -takunai
 *   - Colloquial   -chau / -jau / -cha / -ja
 *   - i-adjective  -katta / -kunai / -ku / -kute
 *
 * Extending: add a row to `RULES`. Each rule is a straight suffix swap —
 * keep it mechanical. For irregulars (する, 来る, 行く's 行った, copula 〜だ,
 * adjective 良い / いい) use the `word_forms` table instead (populated
 * out-of-band) — rules would fight each other on those shapes.
 */

// Each rule: [from, to, label]
// Rules are order-sensitive for tagging clarity but the engine applies all
// applicable rules at every step, so the order does not change correctness.
const RULES = [
  // ── Polite ────────────────────────────────────────────────────────────────
  ['ませんでした',     'る',   'polite-past-neg(v1)'],
  ['いませんでした',   'う',   'polite-past-neg(v5u)'],
  ['きませんでした',   'く',   'polite-past-neg(v5k)'],
  ['ぎませんでした',   'ぐ',   'polite-past-neg(v5g)'],
  ['しませんでした',   'す',   'polite-past-neg(v5s)'],
  ['ちませんでした',   'つ',   'polite-past-neg(v5t)'],
  ['にませんでした',   'ぬ',   'polite-past-neg(v5n)'],
  ['びませんでした',   'ぶ',   'polite-past-neg(v5b)'],
  ['みませんでした',   'む',   'polite-past-neg(v5m)'],
  ['りませんでした',   'る',   'polite-past-neg(v5r)'],
  ['ました',      'る',   'polite-past(v1)'],
  ['いました',    'う',   'polite-past(v5u)'],
  ['きました',    'く',   'polite-past(v5k)'],
  ['ぎました',    'ぐ',   'polite-past(v5g)'],
  ['しました',    'す',   'polite-past(v5s)'],
  ['ちました',    'つ',   'polite-past(v5t)'],
  ['にました',    'ぬ',   'polite-past(v5n)'],
  ['びました',    'ぶ',   'polite-past(v5b)'],
  ['みました',    'む',   'polite-past(v5m)'],
  ['りました',    'る',   'polite-past(v5r)'],
  ['ません',      'る',   'polite-neg(v1)'],
  ['いません',    'う',   'polite-neg(v5u)'],
  ['きません',    'く',   'polite-neg(v5k)'],
  ['ぎません',    'ぐ',   'polite-neg(v5g)'],
  ['しません',    'す',   'polite-neg(v5s)'],
  ['ちません',    'つ',   'polite-neg(v5t)'],
  ['にません',    'ぬ',   'polite-neg(v5n)'],
  ['びません',    'ぶ',   'polite-neg(v5b)'],
  ['みません',    'む',   'polite-neg(v5m)'],
  ['りません',    'る',   'polite-neg(v5r)'],
  ['ます',        'る',   'polite(v1)'],
  ['います',      'う',   'polite(v5u)'],
  ['きます',      'く',   'polite(v5k)'],
  ['ぎます',      'ぐ',   'polite(v5g)'],
  ['します',      'す',   'polite(v5s)'],
  ['ちます',      'つ',   'polite(v5t)'],
  ['にます',      'ぬ',   'polite(v5n)'],
  ['びます',      'ぶ',   'polite(v5b)'],
  ['みます',      'む',   'polite(v5m)'],
  ['ります',      'る',   'polite(v5r)'],

  // ── Past (plain) ──────────────────────────────────────────────────────────
  ['た',  'る',  'past(v1)'],          // 食べた → 食べる
  ['った','う',  'past(v5u)'],         // 買った → 買う
  ['った','つ',  'past(v5t)'],         // 立った → 立つ
  ['った','る',  'past(v5r)'],         // 走った → 走る
  ['いた','く',  'past(v5k)'],         // 書いた → 書く
  ['いだ','ぐ',  'past(v5g)'],         // 泳いだ → 泳ぐ
  ['した','す',  'past(v5s)'],         // 話した → 話す
  ['んだ','ぬ',  'past(v5n)'],         // 死んだ → 死ぬ
  ['んだ','ぶ',  'past(v5b)'],         // 遊んだ → 遊ぶ
  ['んだ','む',  'past(v5m)'],         // 読んだ → 読む

  // ── Te-form ───────────────────────────────────────────────────────────────
  ['て',  'る',  'te(v1)'],
  ['って','う',  'te(v5u)'],
  ['って','つ',  'te(v5t)'],
  ['って','る',  'te(v5r)'],
  ['いて','く',  'te(v5k)'],
  ['いで','ぐ',  'te(v5g)'],
  ['して','す',  'te(v5s)'],
  ['んで','ぬ',  'te(v5n)'],
  ['んで','ぶ',  'te(v5b)'],
  ['んで','む',  'te(v5m)'],

  // ── Negative ──────────────────────────────────────────────────────────────
  ['なかった', 'る', 'past-neg(v1)'],
  ['わなかった','う','past-neg(v5u)'],
  ['かなかった','く','past-neg(v5k)'],
  ['がなかった','ぐ','past-neg(v5g)'],
  ['さなかった','す','past-neg(v5s)'],
  ['たなかった','つ','past-neg(v5t)'],
  ['ななかった','ぬ','past-neg(v5n)'],
  ['ばなかった','ぶ','past-neg(v5b)'],
  ['まなかった','む','past-neg(v5m)'],
  ['らなかった','る','past-neg(v5r)'],
  ['ない',   'る', 'neg(v1)'],
  ['わない', 'う', 'neg(v5u)'],
  ['かない', 'く', 'neg(v5k)'],
  ['がない', 'ぐ', 'neg(v5g)'],
  ['さない', 'す', 'neg(v5s)'],
  ['たない', 'つ', 'neg(v5t)'],
  ['なない', 'ぬ', 'neg(v5n)'],
  ['ばない', 'ぶ', 'neg(v5b)'],
  ['まない', 'む', 'neg(v5m)'],
  ['らない', 'る', 'neg(v5r)'],

  // ── Potential / passive ───────────────────────────────────────────────────
  // v1 potential = passive = -rareru; we strip to the dict form.
  ['られる', 'る', 'potential-or-passive(v1)'],
  ['える',   'う', 'potential(v5u)'],
  ['ける',   'く', 'potential(v5k)'],
  ['げる',   'ぐ', 'potential(v5g)'],
  ['せる',   'す', 'potential(v5s)'],
  ['てる',   'つ', 'potential(v5t)'],
  ['ねる',   'ぬ', 'potential(v5n)'],
  ['べる',   'ぶ', 'potential(v5b)'],
  ['める',   'む', 'potential(v5m)'],
  ['れる',   'る', 'potential(v5r)'],

  // ── Causative ─────────────────────────────────────────────────────────────
  ['させる', 'る', 'causative(v1)'],
  ['わせる', 'う', 'causative(v5u)'],
  ['かせる', 'く', 'causative(v5k)'],
  ['がせる', 'ぐ', 'causative(v5g)'],
  ['させる', 'す', 'causative(v5s)'],
  ['たせる', 'つ', 'causative(v5t)'],
  ['なせる', 'ぬ', 'causative(v5n)'],
  ['ばせる', 'ぶ', 'causative(v5b)'],
  ['ませる', 'む', 'causative(v5m)'],
  ['らせる', 'る', 'causative(v5r)'],

  // ── Volitional ────────────────────────────────────────────────────────────
  ['よう', 'る', 'vol(v1)'],
  ['おう', 'う', 'vol(v5u)'],
  ['こう', 'く', 'vol(v5k)'],
  ['ごう', 'ぐ', 'vol(v5g)'],
  ['そう', 'す', 'vol(v5s)'],
  ['とう', 'つ', 'vol(v5t)'],
  ['のう', 'ぬ', 'vol(v5n)'],
  ['ぼう', 'ぶ', 'vol(v5b)'],
  ['もう', 'む', 'vol(v5m)'],
  ['ろう', 'る', 'vol(v5r)'],

  // ── Conditional -ba ───────────────────────────────────────────────────────
  ['れば', 'る', 'cond(v1)'],
  ['えば', 'う', 'cond(v5u)'],
  ['けば', 'く', 'cond(v5k)'],
  ['げば', 'ぐ', 'cond(v5g)'],
  ['せば', 'す', 'cond(v5s)'],
  ['てば', 'つ', 'cond(v5t)'],
  ['ねば', 'ぬ', 'cond(v5n)'],
  ['べば', 'ぶ', 'cond(v5b)'],
  ['めば', 'む', 'cond(v5m)'],

  // ── Conditional -tara (derives from past) ─────────────────────────────────
  ['たら', 'る', 'tara(v1)'],
  ['ったら','う', 'tara(v5u)'],
  ['ったら','つ', 'tara(v5t)'],
  ['ったら','る', 'tara(v5r)'],
  ['いたら','く', 'tara(v5k)'],
  ['いだら','ぐ', 'tara(v5g)'],
  ['したら','す', 'tara(v5s)'],
  ['んだら','ぬ', 'tara(v5n)'],
  ['んだら','ぶ', 'tara(v5b)'],
  ['んだら','む', 'tara(v5m)'],

  // ── Desire (-tai) ─────────────────────────────────────────────────────────
  // -tai inflects like an i-adjective; we unwind one step to the -tai form
  // first, then the -tai → masu-stem → dict rules get us to the verb base.
  ['たくなかった', 'たい', 'tai-past-neg'],
  ['たくない',     'たい', 'tai-neg'],
  ['たかった',     'たい', 'tai-past'],
  ['たい',         'る',   'tai(v1)'],
  ['いたい',       'う',   'tai(v5u)'],
  ['きたい',       'く',   'tai(v5k)'],
  ['ぎたい',       'ぐ',   'tai(v5g)'],
  ['したい',       'す',   'tai(v5s)'],
  ['ちたい',       'つ',   'tai(v5t)'],
  ['にたい',       'ぬ',   'tai(v5n)'],
  ['びたい',       'ぶ',   'tai(v5b)'],
  ['みたい',       'む',   'tai(v5m)'],
  ['りたい',       'る',   'tai(v5r)'],

  // ── Colloquial -chau / -jau ───────────────────────────────────────────────
  ['ちゃう', 'る', 'chau(v1)'],
  ['っちゃう','う','chau(v5u)'],
  ['っちゃう','つ','chau(v5t)'],
  ['っちゃう','る','chau(v5r)'],
  ['いちゃう','く','chau(v5k)'],
  ['しちゃう','す','chau(v5s)'],
  ['じゃう',  'ぐ','jau(v5g)'],
  ['んじゃう','ぬ','jau(v5n)'],
  ['んじゃう','ぶ','jau(v5b)'],
  ['んじゃう','む','jau(v5m)'],

  // ── i-adjective ───────────────────────────────────────────────────────────
  ['くなかった', 'い', 'adj-past-neg'],
  ['くない',     'い', 'adj-neg'],
  ['かった',     'い', 'adj-past'],
  ['くて',       'い', 'adj-te'],
  ['く',         'い', 'adj-adv'],
];

/**
 * Deinflect an inflected form.
 *
 * Returns an array of `{ base, inflections }` entries (deduplicated). The
 * original surface form is always included as its own candidate so that
 * non-inflected matches (kana-only nouns, katakana loanwords, etc.) still
 * surface even when a suffix rule happens to apply coincidentally.
 *
 * @param {string} form  inflected or plain surface
 * @returns {{ base: string, inflections: string[] }[]}
 */
function deinflect(form) {
  if (!form) return [];

  // BFS so identical rewrites from different paths collapse early.
  const seen = new Map();                 // base → shortest inflection path
  const queue = [[form, []]];

  while (queue.length) {
    const [cur, path] = queue.shift();
    if (seen.has(cur) && seen.get(cur).length <= path.length) continue;
    seen.set(cur, path);

    for (const [from, to, label] of RULES) {
      if (!cur.endsWith(from)) continue;
      // Reject rewrites that would leave a zero-length stem
      // (e.g. た → る on the bare form た itself).
      if (cur.length - from.length < 1) continue;
      const next = cur.slice(0, cur.length - from.length) + to;
      queue.push([next, [...path, label]]);
    }
  }

  return [...seen.entries()].map(([base, inflections]) => ({ base, inflections }));
}

module.exports = { deinflect };
