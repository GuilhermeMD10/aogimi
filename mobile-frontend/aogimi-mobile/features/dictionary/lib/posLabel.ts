// JMdict part-of-speech strings are long: `word_meanings.pos` holds the DTD
// entities expanded to prose and joined with ", " by `parse_jmdict.js`, so a
// single sense arrives as
//
//   "noun (common) (futsuumeishi), noun or participle which takes the aux. verb suru"
//
// The handoff draws that as one short chip — NOUN · SURU. This is the
// compactor. It is display-only: nothing downstream parses the result, and the
// raw string stays in the data.

/**
 * Longest-match-first, because "noun or participle which takes the aux. verb
 * suru" also starts with "noun". Order in this array is the matching order.
 */
const RULES: readonly (readonly [test: string, label: string])[] = [
  ['noun or participle which takes the aux. verb suru', 'suru'],
  ['adjectival nouns or quasi-adjectives', 'na-adj'],
  ['pre-noun adjectival', 'pre-noun'],
  ['nouns which may take the genitive case particle', 'no-adj'],
  ['expressions', 'expression'],
  // Parentheticals are stripped before matching, so this tests the bare word.
  ['adjective', 'i-adj'],
  ['auxiliary verb', 'aux verb'],
  ['auxiliary adjective', 'aux adj'],
  ['ichidan verb', 'ichidan'],
  ['godan verb', 'godan'],
  ['kuru verb', 'kuru'],
  ['suru verb', 'suru'],
  ['transitive verb', 'transitive'],
  ['intransitive verb', 'intransitive'],
  ['proper noun', 'proper noun'],
  ['noun', 'noun'],
  ['adverb', 'adverb'],
  ['pronoun', 'pronoun'],
  ['particle', 'particle'],
  ['conjunction', 'conjunction'],
  ['interjection', 'interjection'],
  ['prefix', 'prefix'],
  ['suffix', 'suffix'],
  ['counter', 'counter'],
  ['numeric', 'numeric'],
];

/** How many parts a chip shows. Two is the handoff's widest ("NOUN · SURU"); a
 *  third pushes the chip past the gloss it shares a row with. */
const MAX_PARTS = 2;

/**
 * `"noun (common) (futsuumeishi), ...suru"` → `"NOUN · SURU"`.
 *
 * Returns null when there is nothing to show, so a caller can skip the chip
 * rather than render an empty pill.
 */
export function posLabel(pos: string | null | undefined): string | null {
  if (!pos) return null;

  const parts: string[] = [];
  for (const raw of pos.split(',')) {
    // Parentheticals are the romaji gloss of the term before them
    // ("(futsuumeishi)") and never add information at chip size.
    const cleaned = raw.replace(/\([^)]*\)/g, '').trim().toLowerCase();
    if (!cleaned) continue;

    const rule = RULES.find(([test]) => cleaned.startsWith(test));
    // No rule: keep the cleaned text, which is already short for the tags that
    // have no entry here (e.g. "copula"). A missing rule degrades to a longer
    // chip, never to a wrong one.
    const label = rule ? rule[1] : cleaned;
    if (!parts.includes(label)) parts.push(label);
    if (parts.length === MAX_PARTS) break;
  }

  return parts.length > 0 ? parts.join(' · ').toUpperCase() : null;
}
