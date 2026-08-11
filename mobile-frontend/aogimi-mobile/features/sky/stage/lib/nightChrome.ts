/**
 * The sky stage's glass-chrome fills — the two values `palette` does not carry.
 *
 * **Why this file is nine lines and the web's is fifty.** The web's
 * `nightChrome.ts` restates a whole ink ramp, tint set and border pair because
 * over there the stage is night in *both* themes, so every piece of chrome
 * floating on it has to opt out of the theme tokens. Mobile is pinned to the one
 * Midnight palette, so `palette` **is** night: `ink`/`soft`/`muted`/`faint`,
 * `tintA`/`tintB`, `bdA`/`bdB`, `active`/`activeInk`, `danger`, `gold`, `accent`
 * and `track` all already mean here exactly what `NIGHT`'s copies mean there.
 * Restating them would be a second set of literals free to drift from the first
 * — the thing the token bridge in `theme/tokens.ts` exists to prevent.
 *
 * What is genuinely missing is the panel fill. `palette.paper` is the app's
 * opaque filled surface; the stage needs a *translucent* one, because chrome
 * here floats over a live star map and a solid slab would punch a hole in it.
 * Deliberately not the dock's white tint (`Dock.tsx`'s own `GLASS` block) — two
 * different materials, kept apart: the dock is app chrome, this is one feature's
 * surface.
 *
 * **Both densities were raised in the 2026-08-10 colour reset.** At 0.66 / 0.86
 * over the star field, text on these panels competed with the stars behind it
 * and low-emphasis ink lost. A floating bar still has to show the sky through
 * it, so `glass` stays translucent — just enough denser to win; `panel` is now
 * near-opaque, since anything you actually *read* should not have a star map
 * running through the letterforms.
 *
 * Rank colours are **not** here. Dots, bars and pills read `RANK_COLORS` from
 * `features/sky/map/lib/palette.ts`, the same ramp the stars are drawn from, so
 * the list chrome and the sky can never disagree.
 */
export const NIGHT = {
  /** Floating chrome that must not hide the sky behind it — bars, pills. */
  glass: 'rgba(16, 22, 40, 0.82)',
  /** Denser, for surfaces you actually read against — sheets, dialogs. */
  panel: 'rgba(12, 17, 32, 0.96)',
} as const;
