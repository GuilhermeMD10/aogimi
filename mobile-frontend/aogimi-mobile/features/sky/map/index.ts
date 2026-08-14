/**
 * The `map` sub-feature's public surface — the star map engine, and only the engine. It knows
 * nothing about decks, routes or the API: hand it a seed and card rows and it draws. The screen that
 * wraps it in chrome is the sibling `stage`.
 *
 * Three layers, and the split is load-bearing:
 *
 *   `lib/`        plain TypeScript, **a verbatim copy of the web's**. No React, no platform globals.
 *                 `npm run verify:sky` asserts it produces bit-identical output, so one seed makes
 *                 one sky on every platform. Read `lib/README.md` before touching anything in it.
 *   `hooks/`      the native bindings: `useSkyFrame` is copied unchanged (it is pure React + lib),
 *                 `useSkyCamera` is the rewritten platform half — the live pose lives in Reanimated
 *                 shared values on the UI thread, where the web has a ResizeObserver and a wheel
 *                 listener. Its clamp runs from `native/cameraWorklet.ts`, a mirror of the lib's own
 *                 guarded by `npm run verify:camera`.
 *   `components/` the **Skia** renderer.
 *
 * Mirrors `web-frontend/aogimi-web/features/sky/map/index.ts`. Two exports there are deliberately
 * absent here:
 *
 *   `useSkySeed`  the web fetches the account's seed through its own api client. On mobile the seed
 *                 arrives on the user profile (`user.sky_seed`), so the host reads it from
 *                 `AuthContext` and there is nothing for a hook to do.
 *   `Sky`         the web's demo harness, routed nowhere. A second composition root is not worth
 *                 carrying on a platform that has no demo page to put it on.
 */

// The map itself, for a host composing its own screen around it: uuid-keyed focus/selection,
// per-deck frame meta, and the overlay insets the camera fits inside.
export { SkyMap } from './components/SkyMap';
export type { SkyFrameMeta } from './components/SkyMap';
export type { Insets } from './lib/types';

export { buildSky, dayBucketOf, todayBucket } from './lib/buildSky';
export type { SkyCard, SkyDeckSource } from './lib/buildSky';

// The generator, for a caller building a sky outside React.
export { SkyGenerator } from './lib/generator';

/** The hue presets. The sky owns the palette; a picker (when there is one) owns which is chosen. */
export { DEFAULT_SKY_HUE, SKY_HUES, SKY_PALETTES } from './lib/palette';
export type { SkyHue, SkyPalette } from './lib/palette';

export type { CardContent } from './lib/cards';
export type { Deck, FocusPath, SkySnapshot, Star } from './lib/types';
