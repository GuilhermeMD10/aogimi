// Pitch-accent helpers.
//
// Kanjium ships positions as strings like "0", "1", "2,3". A position of 0
// means heiban (flat) — low on the first mora, high on every following mora,
// no drop within the word. A position of N (where N <= mora count) means the
// pitch drops *after* the N-th mora.

/** Small kana that fuse with the previous mora rather than being one of
 *  their own (yōon ゃゅょ, small vowels, etc.). */
const SMALL_KANA = new Set([
  // hiragana
  'ゃ', 'ゅ', 'ょ', 'ゎ',
  'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
  // katakana
  'ャ', 'ュ', 'ョ', 'ヮ',
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
]);

/** Split a kana string into mora. Yōon (small ya/yu/yo) attach to the
 *  preceding character; sokuon (っ), hatsuon (ん), and the long-vowel mark
 *  (ー) each form their own mora.
 *
 *  Examples:
 *    splitMora('あおぞら')   → ['あ', 'お', 'ぞ', 'ら']         (4 mora)
 *    splitMora('にっぽん')   → ['に', 'っ', 'ぽ', 'ん']         (4 mora)
 *    splitMora('しゃしん')   → ['しゃ', 'し', 'ん']             (3 mora)
 *    splitMora('コーヒー')   → ['コ', 'ー', 'ヒ', 'ー']         (4 mora) */
export function splitMora(kana: string): string[] {
  const mora: string[] = [];
  for (const ch of kana) {
    if (SMALL_KANA.has(ch) && mora.length > 0) {
      mora[mora.length - 1] += ch;
    } else {
      mora.push(ch);
    }
  }
  return mora;
}

/** Parse the raw Kanjium string ("0", "1", "2,3") into numeric positions.
 *  Returns an empty array for null / unparseable input. */
export function parsePitchPositions(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/** For an N-mora reading and pitch position P, return the per-mora pitch
 *  pattern as 'H'igh / 'L'ow flags (length N). Standard Japanese rules:
 *
 *    - P = 0 (heiban):   L, H, H, … H            no drop within word
 *    - P = 1 (atamadaka): H, L, L, … L
 *    - P = N (odaka):    L, H, H, … H            drop is on the *following*
 *                                                 particle, not in the word
 *    - 1 < P < N         L, H, H (P times), L L  (nakadaka)
 *
 *  `dropAfter` is the mora index (1-based) at which the pitch drops, or
 *  `null` when there is no drop within the word (heiban or odaka).
 *  Note: caller still needs the raw position to know whether odaka vs
 *  heiban — both produce the same in-word pattern but only odaka drops on
 *  the trailing particle. */
export type PitchPattern = {
  /** Per-mora 'H' or 'L', length matches mora count. */
  states: ('H' | 'L')[];
  /** Mora index (1-based) after which the pitch drops; null for heiban/odaka
   *  (no drop *within* the word). */
  dropAfter: number | null;
  /** True when position equals mora count (drop falls on the next particle). */
  isOdaka: boolean;
};

export function pitchPattern(moraCount: number, position: number): PitchPattern {
  if (moraCount <= 0) {
    return { states: [], dropAfter: null, isOdaka: false };
  }
  const states: ('H' | 'L')[] = new Array(moraCount).fill('L');
  if (position === 0) {
    // Heiban: low on first mora, high on the rest.
    for (let i = 1; i < moraCount; i++) states[i] = 'H';
    return { states, dropAfter: null, isOdaka: false };
  }
  if (position === 1) {
    // Atamadaka: high on first mora only.
    states[0] = 'H';
    return { states, dropAfter: 1, isOdaka: false };
  }
  // Nakadaka / odaka: low first mora, high up to position, low after.
  const cap = Math.min(position, moraCount);
  for (let i = 1; i < cap; i++) states[i] = 'H';
  if (position >= moraCount) {
    // Odaka: no in-word drop; the trailing particle takes the fall.
    return { states, dropAfter: null, isOdaka: true };
  }
  return { states, dropAfter: position, isOdaka: false };
}
