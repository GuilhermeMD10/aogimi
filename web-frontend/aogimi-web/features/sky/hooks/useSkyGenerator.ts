'use client';
import { useCallback, useRef, useState } from 'react';

import type { CardContent } from '../lib/cards';
import { DEFAULT_SEED } from '../lib/config';
import { SkyGenerator } from '../lib/generator';
import type { SkySnapshot } from '../lib/types';

const EMPTY: SkySnapshot = { stars: [], links: [], constellations: [], decks: [] };

/**
 * The snapshot is a field rather than spread into this object, and that is not cosmetic: every
 * memoised cost downstream keys off its identity, and a spread would mint a fresh object each render
 * and rebuild every quadtree in the sky for nothing.
 */
export type SkyController = {
  snapshot: SkySnapshot;
  /**
   * Mine one card, as the generator's own signature — passed straight through rather than narrowed,
   * because this is the seam a host feeds real cards into:
   *
   *   bucket  – grouping key; one constellation per distinct value (Aogimi: the UTC creation day)
   *   key     – the card's IMMUTABLE identity (its uuid); with deckKey, what placement draws from
   *   did     – render-local deck index (layout only, no placement weight)
   *   deckKey – the deck's IMMUTABLE identity (its uuid)
   *   card    – faces, mastery rank and review count, from the host's own card
   *
   * Every argument is required: each one is something only the host knows, and a default for any of
   * them would be the component quietly inventing data. Returns false when the deck's field could
   * not seat the card, in which case nothing changed and no snapshot is published.
   */
  addStar: (args: { bucket: string; key: string; did: number; deckKey: string; card: CardContent }) => boolean;
  /** Count one more review of a star's card; returns the new total, or null if it is gone. */
  bumpStar: (id: number) => number | null;
  /** Record that these stars have now been drawn for the reader, so they never pop again. */
  markSeen: (ids: number[]) => void;
  /** Close every open session. Every deck can have one, so this is not a single act any more. */
  sealNow: () => void;
  /** Wipe the sky and rewind to this seed's stream. */
  reset: (seed: string) => void;
};

/**
 * React binding over SkyGenerator. The generator stays the source of truth and each
 * mutation republishes a snapshot; several mutations in one handler still cost one render.
 */
export function useSkyGenerator(): SkyController {
  const genRef = useRef<SkyGenerator | null>(null);
  genRef.current ??= new SkyGenerator(DEFAULT_SEED);

  const [snapshot, setSnapshot] = useState<SkySnapshot>(EMPTY);

  const publish = useCallback(() => setSnapshot(genRef.current!.snapshot()), []);

  const addStar = useCallback(
    (args: { bucket: string; key: string; did: number; deckKey: string; card: CardContent }) => {
      const placed = genRef.current!.addStar(args);
      if (placed) publish();
      return placed;
    },
    [publish],
  );

  const bumpStar = useCallback(
    (id: number) => {
      const count = genRef.current!.bumpStar(id);
      if (count !== null) publish();
      return count;
    },
    [publish],
  );

  // no-ops cheaply: the renderer marks on a timer and would otherwise republish the whole
  // snapshot on every idle tick, rebuilding the cluster trees each time for nothing
  const markSeen = useCallback(
    (ids: number[]) => {
      if (genRef.current!.markSeen(ids)) publish();
    },
    [publish],
  );

  const sealNow = useCallback(() => {
    if (genRef.current!.sealOpen()) publish();
  }, [publish]);

  const reset = useCallback(
    (seed: string) => {
      genRef.current!.reset(seed);
      publish();
    },
    [publish],
  );

  return { snapshot, addStar, bumpStar, markSeen, sealNow, reset };
}
