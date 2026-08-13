/**
 * The sky stage's chrome fills — the two values `palette` does not carry.
 *
 * **These are the panels that float over the star map** — the stage bars, the
 * deck bar, the ledger, the card sheet. They need a fill of their own because
 * `palette.paper` is opaque and a solid slab would punch a hole in a live sky.
 * Deliberately not the dock's material either (`Dock.tsx`'s own `GLASS` block):
 * two different surfaces, kept apart, because the dock is app chrome and this is
 * one feature's.
 *
 * ── Why they are light now (2026-08-11) ────────────────────────────────────
 * They were a translucent blue-black, which was right while the app was dark.
 * The colour reset flipped the palette to a light baseline — **text is black** —
 * and `sky1..3` are the one group that stayed dark, because stars need night.
 * That left black ink on a near-black panel: the least readable combination in
 * the app.
 *
 * So the panels inverted and the sky did not. A light frosted panel over a dark
 * sky keeps `palette.ink` / `soft` / `muted` readable on it with no second ink
 * ramp to maintain — which is the whole reason this file is a few lines and the
 * web's equivalent is fifty. Over there the stage is night in *both* themes, so
 * every scrap of chrome has to restate its own ink; here, inverting two fills
 * buys the same result and keeps one source of truth for ink.
 *
 * `glass` stays translucent so a floating bar still shows the sky moving behind
 * it. `panel` is near-opaque, because anything you actually *read* should not
 * have a star map running through the letterforms.
 *
 * Rank colours are **not** here. Dots, bars and pills read `RANK_COLORS` from
 * `features/sky/map/lib/palette.ts`, the same ramp the stars are drawn from, so
 * the list chrome and the sky can never disagree. Those are tuned for the dark
 * sky and the flip left them alone.
 */
export const NIGHT = {
  /** Floating chrome that must not hide the sky behind it — bars, pills. */
  glass: 'rgba(255, 255, 255, 0.86)',
  /** Denser, for surfaces you actually read against — sheets, dialogs. */
  panel: 'rgba(255, 255, 255, 0.97)',
} as const;
