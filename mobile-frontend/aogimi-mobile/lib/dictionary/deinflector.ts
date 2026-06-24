// Japanese verb / adjective deinflector. Direct port of
// `backend/src/search/deinflector.js` — keep the two in sync when adding
// rules; mobile uses this against the bundled SQLite dictionary and the
// backend uses it against Postgres, so the rule set has to match for
// search parity.

type Rule = [from: string, to: string, label: string];

const RULES: Rule[] = [
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
  ['た',  'る',  'past(v1)'],
  ['った','う',  'past(v5u)'],
  ['った','つ',  'past(v5t)'],
  ['った','る',  'past(v5r)'],
  ['いた','く',  'past(v5k)'],
  ['いだ','ぐ',  'past(v5g)'],
  ['した','す',  'past(v5s)'],
  ['んだ','ぬ',  'past(v5n)'],
  ['んだ','ぶ',  'past(v5b)'],
  ['んだ','む',  'past(v5m)'],

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

  // ── Conditional -tara ────────────────────────────────────────────────────
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

export type DeinflectCandidate = { base: string; inflections: string[] };

/**
 * Deinflect an inflected form. Returns every candidate base (including
 * the original surface) so ambiguous shapes like 来た (verb past) and
 * 北 (noun) both get a chance to match.
 */
export function deinflect(form: string): DeinflectCandidate[] {
  if (!form) return [];

  const seen = new Map<string, string[]>();
  const queue: Array<[string, string[]]> = [[form, []]];

  while (queue.length) {
    const [cur, path] = queue.shift()!;
    const existing = seen.get(cur);
    if (existing && existing.length <= path.length) continue;
    seen.set(cur, path);

    for (const [from, to, label] of RULES) {
      if (!cur.endsWith(from)) continue;
      if (cur.length - from.length < 1) continue;
      const next = cur.slice(0, cur.length - from.length) + to;
      queue.push([next, [...path, label]]);
    }
  }

  return Array.from(seen.entries()).map(([base, inflections]) => ({
    base,
    inflections,
  }));
}
