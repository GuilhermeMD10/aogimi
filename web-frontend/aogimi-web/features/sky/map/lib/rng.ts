/**
 * Deterministic randomness for the sky. A seed is free text (user id, deck id, anything);
 * it is hashed to 32 bits and drives a mulberry32 stream. Same seed, same stream, same sky —
 * on any platform, since only integer ops and IEEE doubles are involved.
 */

export type Rng = () => number;

/** FNV-1a, folded to an unsigned 32-bit int. Stable across JS engines. */
export const hashSeed = (seed: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32: tiny, fast, and plenty for scattering stars. Returns [0, 1) like Math.random. */
export const mulberry32 = (state: number): Rng => {
  let a = state >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * The stream one card places from, keyed on the card's own identity rather than on how many cards
 * happened to come before it.
 *
 * This is what lets a sky be saved and continued. A single shared stream carries a cursor that a
 * snapshot cannot capture, so every card placed after a reload lands somewhere other than where an
 * unbroken run would have put it. Per-card streams have no cursor: there is nothing to save, so
 * nothing can be out of step when it is restored.
 *
 * `key` must be immutable for the life of the card — its id, or the moment it was created. Never
 * anything that can be edited, or the star moves when the card does.
 *
 * Two keys can collide in 32 bits, and the cards then draw the same candidate positions. That
 * degrades rather than breaks: the second one is rejected for spacing and retries, exactly as it
 * would against any other neighbour.
 */
export const streamFor = (seed: string, key: string): Rng => mulberry32(hashSeed(`${seed}/${key}`));
