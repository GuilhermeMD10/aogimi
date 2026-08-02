import type { CardContent } from './cards';
import { SkyGenerator } from './generator';
import type { SkySnapshot } from './types';

/**
 * The whole mount path in one call: the host's card rows in, a finished snapshot out.
 *
 * Nothing positional is ever stored — a sky is regenerated from scratch every time from
 * (seed, deck uuid, card uuid), which per-card streams make exact and the benchmark makes cheap
 * (the 5000-card deck the quota allows builds in ~26ms). The same inputs produce the same sky on
 * every mount, every device, every platform.
 *
 * Plain TypeScript like the rest of this directory: no React, no DOM. The React half is a
 * `useMemo` around this call.
 */

/** What the host hands the sky per card — the projection of its own card row the sky reads. */
export type SkyCard = {
  /** The card's uuid. Immutable identity: placement is drawn from it, and a star click hands it
   *  back through `Star.key`. */
  id: string;
  front: string;
  back: string;
  /** 0..3 up the host's SRS ladder (Aogimi: new / seen / learned / mastered). */
  mastery: number;
  /** Times reviewed (`reviewed_times`). */
  count: number;
  /** ISO creation timestamp. Its UTC date is the card's constellation bucket — frozen by
   *  construction, since a creation time never changes. */
  createdAt: string;
};

export type SkyDeckSource = {
  /** The deck's uuid. Placement identity — the same deck makes the same shapes wherever it is
   *  rendered and whatever render-local index it gets. */
  key: string;
  name: string;
  cards: SkyCard[];
};

/**
 * The UTC day of an ISO timestamp — the constellation bucket. An unparseable stamp groups under
 * one 'undated' constellation rather than throwing: a malformed row costs a misplaced star, not
 * the whole sky.
 */
export const dayBucketOf = (iso: string): string => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : 'undated';
};

/** Today's bucket, for `sealStale` — which constellation is still allowed to be growing. */
export const todayBucket = (): string => new Date().toISOString().slice(0, 10);

export const buildSky = (args: { seed: string; today: string; decks: SkyDeckSource[] }): SkySnapshot => {
  const gen = new SkyGenerator(args.seed);

  args.decks.forEach((deck, did) => {
    gen.nameDeck(did, deck.name);

    // Chronological feed order is a correctness requirement, not a preference: the bucket seals
    // on change, so an out-of-order card would reopen a closed day as a second constellation.
    // The id tiebreak matters too — a bulk import writes many cards with one created_at, and
    // without it their order (and with it every position) would follow the fetch's row order.
    const sorted = [...deck.cards].sort(
      (a, b) =>
        (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );

    for (const c of sorted) {
      const card: CardContent = { front: c.front, back: c.back, mastery: c.mastery, count: c.count };
      gen.addStar({ bucket: dayBucketOf(c.createdAt), key: c.id, did, deckKey: deck.key, card });
    }
  });

  // Only a day that is still today may keep growing — see sealStale. And a replayed sky is
  // history, not news: everything arrives already seen, so nothing pops on mount. (The arrival
  // animation for cards mined *while the sky is open* is a later feature.)
  gen.sealStale(args.today);
  gen.markAllSeen();

  return gen.snapshot();
};
