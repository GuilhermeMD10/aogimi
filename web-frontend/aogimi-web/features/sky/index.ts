/**
 * Public API of the sky feature — the star-map view of the user's cards.
 *
 * Three layers, and the split is load-bearing:
 *
 *   `lib/`        plain TypeScript. No React, no DOM, no browser globals. Written to be copied
 *                 into the mobile app unchanged so one seed makes one sky on every platform —
 *                 see `lib/README.md` before adding anything here.
 *   `hooks/`      the web bindings: the camera's DOM half, the per-frame memoisation, the seed
 *                 fetch, and the demo's interactive generator wrapper.
 *   `components/` the SVG renderer.
 *
 * Wired today: **deck details** — `DeckSky`, locked to its one deck, sharing the page's card
 * selection. The full multi-deck map (`/sky`) is pending its own handoff; `Sky` below is the
 * demo harness that prefigures it, routed nowhere.
 */

// Deck details: the locked single-deck sky + the seam that feeds it.
export { DeckSky } from './components/DeckSky';
export { useSkySeed } from './hooks/useSkySeed';
export { buildSky, dayBucketOf, todayBucket } from './lib/buildSky';
export type { SkyCard, SkyDeckSource } from './lib/buildSky';

// The demo composition root — the reference wiring for the /sky page, not routed.
export { default as Sky } from './components/Sky';

// The generator, for a caller building a sky outside React.
export { SkyGenerator } from './lib/generator';
export { useSkyGenerator } from './hooks/useSkyGenerator';
export type { SkyController } from './hooks/useSkyGenerator';

export type { CardContent } from './lib/cards';
export type { Deck, FocusPath, SkySnapshot, Star } from './lib/types';
