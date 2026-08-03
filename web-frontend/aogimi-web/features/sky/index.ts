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
 * Wired today: **the /decks stage** (`features/study/decks/views/DecksView`), which composes
 * `SkyMap` with its own glass chrome — the /sky route and the deck-details `DeckSky` both merged
 * into it. `Sky` below is the demo harness that prefigured the page, routed nowhere.
 */

// The map itself, for a host composing its own page around it: uuid-keyed focus/selection,
// per-deck frame meta, and the overlay insets the camera fits inside.
export { SkyMap } from './components/SkyMap';
export type { SkyFrameMeta } from './components/SkyMap';
export type { Insets } from './lib/types';

// The seam that feeds a sky: the account's one immutable seed.
export { useSkySeed } from './hooks/useSkySeed';

export { buildSky, dayBucketOf, todayBucket } from './lib/buildSky';
export type { SkyCard, SkyDeckSource } from './lib/buildSky';

// The demo composition root — the reference wiring for the /decks stage, not routed.
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
