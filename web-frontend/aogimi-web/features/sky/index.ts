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
 * selection — and **the /sky page** — `SkyView`, the whole sky with every deck a constellation.
 * `Sky` below is the demo harness that prefigured the page, routed nowhere.
 */

// The /sky page: the whole-sky view the route renders.
export { SkyView } from './views/SkyView';

// Deck details: the locked single-deck sky + the seam that feeds it.
export { DeckSky } from './components/DeckSky';
export { useSkySeed } from './hooks/useSkySeed';

// The panel's always-visible ledger footer — presentational, shared by /sky and deck details.
export { SkyLedger } from './components/SkyLedger';
export type { LedgerTile } from './components/SkyLedger';
export { buildSky, dayBucketOf, todayBucket } from './lib/buildSky';
export type { SkyCard, SkyDeckSource } from './lib/buildSky';

// The demo composition root — the reference wiring for the /sky page, not routed.
export { default as Sky } from './components/Sky';

// The generator, for a caller building a sky outside React.
export { SkyGenerator } from './lib/generator';
export { useSkyGenerator } from './hooks/useSkyGenerator';
export type { SkyController } from './hooks/useSkyGenerator';

/**
 * The hue presets. The sky owns the palette; `SkyHueProvider` owns which one is chosen and the
 * `html[data-sky-hue]` attribute, and `styles/ds-tokens.css` mirrors these four ramps so the
 * mastery chrome outside the canvas follows the sky. (The provider itself imports `lib/palette` by
 * path rather than through this barrel — a barrel both ways would be a cycle.)
 */
export { DEFAULT_SKY_HUE, SKY_HUES, SKY_PALETTES } from './lib/palette';
export type { SkyHue, SkyPalette } from './lib/palette';

export type { CardContent } from './lib/cards';
export type { Deck, FocusPath, SkySnapshot, Star } from './lib/types';
