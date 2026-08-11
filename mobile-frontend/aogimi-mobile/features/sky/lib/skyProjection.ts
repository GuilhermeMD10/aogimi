// The boundary between a card row and a star.
//
// **At the sky domain root, beside `fsrs.ts`, and for the same reason:** it is
// read by `map` (which draws the stars) and produced from `stage`'s card rows,
// and sub-features don't import each other.
//
// `map/lib` is deliberately ignorant of `CardRecord` — it takes a `CardContent`
// and knows nothing about FSRS, decks or the API. This file is the one place
// that knows both vocabularies, which is what keeps the engine portable and
// means a change to the card schema can't ripple into placement maths.

import { displayedRank, retrievabilityAt } from './fsrs';
import type { SkyCard } from '../map/lib/buildSky';
import type { CardRecord, CardState } from '../stage/types';

/** The card ladder as the sky's 0..3 rank index. The sky's own `rankOf` is a
 *  *different* function — it rounds a 0..3 mastery number for rendering — so
 *  the two must not be confused: this is the mapping between them. */
const SKY_RANK: Record<CardState, number> = { new: 0, met: 1, learned: 2, mastered: 3 };

/**
 * A card row projected onto the sky's own shape.
 *
 * **Two independent signals, deliberately.**
 *
 *   `mastery` — the *displayed* rank, which drives the star's shape, colour and
 *               radius. Monotonic from Learned upward: a lapse never takes a
 *               silhouette away (see `fsrs.displayedRank`).
 *   `glow`    — retrievability right now, 0..1, which drives brightness. This
 *               is where a lapse shows: the star holds its form and goes dim.
 *
 * Splitting them is the whole point. Rank alone can't show decay without
 * demoting, and decay alone can't show achievement. Together, a mastered card
 * you've let slip reads as "you knew this, go refresh it" rather than "you lost
 * it".
 *
 * **`glow` is computed once here, at projection time, not per frame.** R moves
 * over *days*, and the sky regenerates on mount, so a value baked at mount is
 * fresh for any session anyone actually sits through. Recomputing it per frame
 * would cost an `exp` + `pow` per star per frame for a number that cannot
 * visibly change in that time — and on a phone that is the difference between a
 * smooth pan and a hot one.
 *
 * Neither field affects **placement**: where a star sits comes from the deck id
 * and the user's `sky_seed` alone. A card that climbs the ladder brightens and
 * changes shape; it does not move.
 *
 * **Returns a `SkyCard`, not a `CardContent`.** The two differ by `id` and
 * `createdAt`, and both are load-bearing rather than decorative: `id` is the
 * uuid a star hands back through `Star.key` (so a tap can name a card), and
 * `createdAt` is the UTC day that buckets the card into its constellation.
 * `CardContent` is the narrower shape the renderer reads *after* placement —
 * producing it here would leave the caller to re-attach the two fields the
 * engine actually needs, which is how this drifted in the first place.
 *
 * **Pass one `now` for a whole projection.** Defaulted for convenience, but a
 * caller mapping a deck should hoist it: a fresh `new Date()` per card puts a
 * few milliseconds of drift between the first star's brightness and the last's.
 */
export function skyCardOf(card: CardRecord, now: Date = new Date()): SkyCard {
  return {
    id: card.id,
    front: card.front,
    back: card.back,
    mastery: SKY_RANK[displayedRank(card.peak_rank ?? card.state, card.state)],
    // Fractional elapsed days — display only. Scheduling floors to whole days;
    // a brightness that stepped once a day would read as a stuck render.
    glow: retrievabilityAt(card.last_reviewed_at, card.stability, now),
    count: card.reviewed_times ?? 0,
    // Non-nullable on the row, and `dayBucketOf` degrades an unparseable stamp
    // to one 'undated' constellation anyway — a malformed row costs a misplaced
    // star, not the whole sky.
    createdAt: card.created_at,
  };
}

/**
 * The rank a card's star is *drawn* as, as a `CardState` rather than an index —
 * for labels and legends, where the sky's numeric rank isn't what you want to
 * show a reader.
 *
 * Falls back to `state` when `peak_rank` is missing, which is only possible on a
 * row that predates migration 027.
 */
export function shownRank(card: Pick<CardRecord, 'state' | 'peak_rank'>): CardState {
  return displayedRank(card.peak_rank ?? card.state, card.state);
}
