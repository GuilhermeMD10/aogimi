'use client';
import { useMemo } from 'react';

import { MAX_ZOOM, SKY_STAR_BUDGET } from '../lib/config';
import type { SkyFrame } from '../lib/tiers';
import type { Constellation, FocusPath, SkySnapshot } from '../lib/types';

type Props = {
  snapshot: SkySnapshot;
  frame: SkyFrame;
  focus: FocusPath;
  zoom: number;
  minZoom: number;
  /** Zoom relative to this tier's fit, which is what the star form's swell is measured against. */
  relZoom: number;
  /** The session still taking cards in the active deck, or undefined. */
  open: Constellation | undefined;
  /** Cards mined but never yet shown. */
  waiting: number;
};

/** What the sky is currently drawn as, in the same words as the phase it came from. */
const PHASE_TEXT = {
  clouds: 'clouds · mostly forms',
  crossing: 'crossing · the clouds are burning off',
  stars: 'stars · every card drawn',
  hidden: 'hidden · the sky is closed, cards still arriving',
} as const;

export function SkyStats({ snapshot, frame, focus, zoom, minZoom, relZoom, open, waiting }: Props) {
  const { stars, constellations, decks } = snapshot;
  // this component re-renders on every camera frame, and neither of these depends on the camera
  const biggestDeck = useMemo(() => decks.reduce((m, d) => Math.max(m, d.starCount), 0), [decks]);
  const smallestDeck = useMemo(
    () => decks.reduce((m, d) => Math.min(m, d.starCount), decks.length ? Infinity : 0),
    [decks],
  );

  const focused = focus.length > 0;
  // summed from what the line actually prints, so the total cannot drift from its own breakdown
  const halos = frame.decks.reduce((n, d) => n + d.halos.length, 0);
  const edges = frame.decks.reduce((n, d) => n + d.edges.length, 0);
  const links = frame.decks.reduce((n, d) => n + d.links.length, 0);
  const drawn = halos + frame.lobeCount + edges + frame.starCount + links;

  return (
    <div className="flex flex-col items-center gap-1 text-sm text-white/60">
      <p>
        {stars.length} cards · {decks.length} decks ({biggestDeck} biggest, {smallestDeck} smallest) ·{' '}
        {constellations.length} sessions · zoom {zoom.toFixed(2)}× of {minZoom.toFixed(2)}–{MAX_ZOOM}× ·{' '}
        {relZoom.toFixed(2)}× of this tier&rsquo;s fit
        {open ? ` · ${open.bucket} still open` : ' · no day open'}
      </p>
      {/* The honest readout of whether the budget is working: `drawn` should stay near the budget
          times the number of groups on screen however many cards the sky holds. If it tracks the card
          count instead, the collapse walk has stopped earning its keep. */}
      <p className="text-white/40">
        {focused ? `inside deck ${focus[0]} · zoom decides` : `all decks · budget ${SKY_STAR_BUDGET}/deck`} ·{' '}
        {PHASE_TEXT[frame.phase]} · {(frame.veil * 100).toFixed(0)}% veiled · {drawn} drawn for{' '}
        {stars.length} cards · {halos} halos, {frame.lobeCount} lobes, {edges} mesh, {frame.starCount}{' '}
        stars, {links} links{waiting ? ` · ${waiting} waiting to be seen` : ''}
      </p>
    </div>
  );
}
