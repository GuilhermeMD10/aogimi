// ═══════════════════════════════════════════════════════════════════════════
// GLASS — the four elevation tiers
// ═══════════════════════════════════════════════════════════════════════════
//
// DESIGN.md's "Elevation & Depth": every surface in the app is a tinted pane
// over the sky gradient, and which pane it is comes down to **one number**.
//
//   Tier 1 · Subtle   inputs at rest, nested inner plates, passive chips
//   Tier 2 · Standard cards, list rows, icon buttons, secondary buttons, nodes
//   Tier 3 · Frosted  popovers, floating hint pills, a *pressed* Tier 2
//   Tier 4 · Intense  bottom sheets and modals
//
// A tier is a fill, a 1px border, a specular top rim (Night only) and — for
// Tiers 3 and 4 — a live blur. Nothing reads the `glass*` palette keys
// directly; they come through `glassTier` so the recipe stays in one place.
//
// ── Blur is a performance rule, not taste ──────────────────────────────────
// The redesign brief (§2) fixes it: **real `BlurView` only on Tier 3/4** —
// popovers, sheets, modals, the study flashcard — **and the dock.** Tier 1/2
// are tinted fill + border + rim and no blur at all. A phone Home draws a
// dozen Tier 1/2 panes; a dozen live backdrop filters is a dropped frame per
// scroll, and at card size the blur contributes almost nothing over the fill
// and the rim. `mountBlur` is the flag that encodes this, so a caller cannot
// get it wrong by reaching past the recipe.
//
// ── It inverts with the theme ──────────────────────────────────────────────
// A translucent film only reads if it darkens or lightens what scrolls under
// it. On Night's indigo canvas that means a **white** wash that brightens with
// the tier; on Day's warm white canvas it means **opaque white** that grows
// denser with the tier, and no specular rim at all (DESIGN.md → Daybreak Glow
// → Glass). Both directions are already in the palette's two columns, which is
// why this file has no `isNight` branch for the fills — only for the things
// that are structurally absent in Day.
//
// **The dock keeps its own material** in `features/app-shell/**`: it is one
// always-on-screen element with its own tweak pass and must stay
// re-balanceable without touching every surface that shares this recipe.

import type { Palette } from './tokens';

/** 1 subtle · 2 standard · 3 frosted · 4 intense. */
export type GlassTier = 1 | 2 | 3 | 4;

export type GlassRecipe = {
  /** Idle fill. */
  fill: string;
  /** Pressed fill. A pressed Tier 2 is a Tier 3 (DESIGN.md says so in as many
   *  words), so the ladder supplies the press state instead of an ad-hoc
   *  lightening step. Tier 4 has nowhere to climb and presses to itself. */
  fillPressed: string;
  bd: string;
  /** Specular inset hairline along the top edge. Transparent on Day. */
  rim: string;
  /** Zero-alpha form of `rim`'s channel, for the sheen gradient's ends. Never
   *  `transparent`, which is zero-alpha *black* and casts grey through a white
   *  ramp. */
  rimEdge: string;
  /** Whether this tier mounts a live `BlurView` — see the header. */
  mountBlur: boolean;
  /** `expo-blur` intensity (1–100) when it does. */
  blurIntensity: number;
  /** What the blur tints toward. Follows the wash, not the theme name. */
  blurTint: 'light' | 'dark';
};

/** The four fills, in order, so a tier can look up its own press step. */
function fillFor(p: Palette, tier: GlassTier): string {
  switch (tier) {
    case 1:
      return p.glassSubtle;
    case 2:
      return p.glassStandard;
    case 3:
      return p.glassFrosted;
    case 4:
      return p.glassIntense;
  }
}

/** DESIGN.md's blur radii per tier, converted to `expo-blur`'s 1–100 scale
 *  (12 / 24 / 32 / 40 px of backdrop blur land around here). Only the last two
 *  are ever used — see the header. */
const BLUR_BY_TIER: Record<GlassTier, number> = { 1: 12, 2: 24, 3: 34, 4: 46 };

/**
 * The full recipe for one tier of the active palette.
 *
 * `isNight` rather than reading the palette, because the two things that differ
 * are *structural* (is there a rim to catch; which way does a blur tint) rather
 * than a colour the columns already carry.
 */
export function glassTier(p: Palette, tier: GlassTier, isNight: boolean): GlassRecipe {
  const rim = isNight ? p.glassRim : 'rgba(255, 255, 255, 0)';
  return {
    fill: fillFor(p, tier),
    fillPressed: fillFor(p, tier === 4 ? 4 : ((tier + 1) as GlassTier)),
    bd: p.glassBorder,
    rim,
    rimEdge: 'rgba(255, 255, 255, 0)',
    mountBlur: tier >= 3,
    blurIntensity: BLUR_BY_TIER[tier],
    blurTint: isNight ? 'dark' : 'light',
  };
}

/** Accent glass — the focused deck node, a selected row, an accent icon plate.
 *  Reserved: a card never takes it. Same shape as a tier so a component can
 *  swap one for the other without branching. */
export function glassAccent(p: Palette, isNight: boolean): GlassRecipe {
  return {
    fill: p.glassAccent,
    fillPressed: p.glassAccentBd,
    bd: p.glassAccentBd,
    rim: isNight ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0)',
    rimEdge: 'rgba(255, 255, 255, 0)',
    mountBlur: false,
    blurIntensity: BLUR_BY_TIER[2],
    blurTint: isNight ? 'dark' : 'light',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy
// ─────────────────────────────────────────────────────────────────────────────

export type GlassWash = {
  fill: string;
  fillPressed: string;
  bd: string;
  sheenTop: string;
  sheenBottom: string;
  lineMid: string;
  lineEdge: string;
  blurTint: 'light' | 'dark';
};

/**
 * @deprecated The pre-redesign wash, now **derived from Tier 2** so the ~1
 * remaining caller (`Touchable`'s `surface="glass"`) picks up the new material
 * without a rewrite. New code takes `glassTier` and the `Glass` primitive.
 *
 * The two sheens collapse onto the tier's single rim: DESIGN.md lights a pane
 * along its top edge only, where the old recipe lit both edges.
 */
export function glassWash(p: Palette, isNight: boolean): GlassWash {
  const g = glassTier(p, 2, isNight);
  return {
    fill: g.fill,
    fillPressed: g.fillPressed,
    bd: g.bd,
    sheenTop: g.rim,
    sheenBottom: 'rgba(255, 255, 255, 0)',
    lineMid: g.rim,
    lineEdge: g.rimEdge,
    blurTint: g.blurTint,
  };
}

/** @deprecated Read `glassTier(...).blurIntensity`. */
export const BLUR_INTENSITY = BLUR_BY_TIER[2];
