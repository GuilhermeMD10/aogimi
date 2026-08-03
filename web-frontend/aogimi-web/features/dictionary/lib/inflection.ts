import type { Inflection } from '../types';

/**
 * The one-line "why is this here" note for a deinflected hit.
 *
 * The deinflector's labels carry the conjugation class that fired the rule
 * (`polite-past(v1)`, `past(v5k)`) because rules are tagged for debugging, not
 * for reading. `(v5k)` tells a learner nothing they can use, and printing it
 * makes a subtle annotation look like a parser leak — so the class is stripped
 * and what's left is the inflection name.
 *
 * A multi-step unwind (食べさせられなかった) arrives as a path of several rules;
 * duplicates collapse because the same name can be reached by two rules on the
 * way down, and the order is the deinflector's (outermost first).
 *
 * Returns null when there is nothing worth saying, so the caller can render
 * nothing at all rather than an empty element.
 */
export function inflectionNote(inflection: Inflection | undefined): string | null {
  if (!inflection?.from) return null;

  const seen = new Set<string>();
  for (const raw of inflection.path) {
    const name = raw.replace(/\(.*?\)/g, '').trim();
    if (name) seen.add(name);
  }

  return seen.size === 0 ? inflection.from : `${inflection.from} · ${[...seen].join(' · ')}`;
}
