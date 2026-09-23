import { glassTier, type Palette } from '@/theme';
import type { DockColors } from './dockGeometry';

/**
 * The dock's material, stated once.
 *
 * Every mark is cut from the same sheet: a live blur, a veil over what it
 * blurred, a lit edge with a sheen across the top of it, one drop shadow. The
 * numbers live here and `DockItem` only spends them. `theme/glass.ts` names
 * this file as the one place the dock's material is allowed to differ from
 * the shared tiers — it is the one always-on-screen element and has to stay
 * re-balanceable without touching every card that shares the recipe.
 *
 * ── The numbers are the dock's own ───────────────────────────────────────────
 * `GLASS` is the `--glass-*` block of the browser mock the dock was tuned in,
 * in the same order and at the same values. Only the blur is converted, from
 * a CSS radius to `expo-blur`'s scale. Nothing in it is a tier: a 60pt circle
 * over scrolling content wants a heavier veil and a brighter rim than a card
 * over the sky, and those were found by eye, not by ladder.
 *
 * ── The colours are the palette's ────────────────────────────────────────────
 * The current route's circle is `active` with `activeInk` on it; an adjacent
 * mark's glyph is `ink` on bare glass; open, every other route is a tile of
 * Tier 4's fill (the densest glass, because that state is a menu) with `muted`
 * on it. So the dock recolours itself with the theme and the material stays.
 *
 * ── What the mock has that this does not ─────────────────────────────────────
 * The mock runs the blur `--glass-halo` (23px) past each circle, faded out by
 * a radial mask, so a line crossing the dock goes soft a little before it
 * meets a mark. A `BlurView` cannot be masked without
 * `@react-native-masked-view/masked-view`, which is not in the binary, so here
 * the blur stops at the circle's edge. The mock also runs the blur through
 * `saturate(150%) brightness(71%)`; `expo-blur` has neither, and the tinted
 * blur plus the veil stand in for both.
 *
 * ── `rest` ───────────────────────────────────────────────────────────────────
 * A route that is not current recedes. Not by `opacity` on the mark: a
 * `BlurView` under any ancestor below full opacity stops blurring, so every
 * resting mark would lose its glass while the current one kept it. Instead the
 * veil, edge, sheen, shadow and glyph each take `rest` as their own opacity,
 * and the blur stays at 1.
 */

/** The sheet, as the mock states it. Alphas are at `rest` 1. */
const GLASS = {
  /** 40px of backdrop blur, on `expo-blur`'s 1–100 scale — the same conversion
   *  `theme/glass.ts` uses for Tier 4. */
  blur: 46,
  /** the wash over what it blurred */
  veilAlpha: 0.36,
  /** the lit edge */
  rimWidth: 1,
  rimAlpha: 0.45,
  /** the specular across the top of it, and how far down the disc it reaches */
  sheenAlpha: 0.27,
  sheenStop: 0.6,
  /** one drop shadow, and one only: `0 8px 20px -4px rgb(0 0 0 / 0.3)`. iOS's
   *  `shadowRadius` is half a CSS blur; the negative spread has no equivalent
   *  and is dropped. */
  shadow: { opacity: 0.3, offsetY: 8, radius: 10 },
  /** How much of the current route's fill is fill. The one departure from the
   *  mock, whose active circle is opaque: here the glass shows through it, so
   *  the current route is a tinted pane rather than a painted disc. */
  activeAlpha: 0.78,
} as const;

export type DockMaterial = {
  colors: DockColors;
  /** wash over the blur */
  veil: string;
  /** the lit edge */
  rimWidth: number;
  edge: string;
  /** specular across the top of the disc, and its zero-alpha end */
  sheen: string;
  sheenEdge: string;
  /** how far down the disc the sheen reaches, 0–1 */
  sheenStop: number;
  blur: number;
  blurTint: 'light' | 'dark';
  shadow: {
    color: string;
    /** at `rest` 1 */
    opacity: number;
    offsetY: number;
    radius: number;
  };
  /** Three inks: the current route's glyph on its fill, an adjacent one on
   *  bare glass, and — open — every other route on its tile. */
  ink: {
    active: string;
    glass: string;
    muted: string;
  };
};

const white = (alpha: number): string => `rgba(255, 255, 255, ${alpha})`;
const black = (alpha: number): string => `rgba(0, 0, 0, ${alpha})`;

export function dockMaterial(p: Palette, isNight: boolean): DockMaterial {
  const tile = glassTier(p, 4, isNight).fill;
  return {
    colors: {
      active: alpha(p.active, GLASS.activeAlpha),
      tile,
      clear: clear(tile),
    },
    // The veil goes the way the theme does — white over Day, black over Night,
    // as the mock's two schemes do. Night's is the one place the dock's glass
    // darkens rather than brightens: a mark has to read as a solid over
    // whatever scrolls under it, not as one more pane of the sky.
    veil: isNight ? black(GLASS.veilAlpha) : white(GLASS.veilAlpha),
    rimWidth: GLASS.rimWidth,
    // The edge and the sheen are lit white in both themes, as the mock's are.
    edge: white(GLASS.rimAlpha),
    sheen: white(GLASS.sheenAlpha),
    sheenEdge: white(0),
    sheenStop: GLASS.sheenStop,
    blur: GLASS.blur,
    blurTint: isNight ? 'dark' : 'light',
    // Black in both themes: this is a shadow, not a glow.
    shadow: { color: '#000', ...GLASS.shadow },
    ink: {
      active: p.activeInk,
      glass: p.ink,
      muted: p.muted,
    },
  };
}

/**
 * The same colour at another alpha. Takes `#rrggbb` and `rgb[a](r, g, b[, a])`,
 * which is every form the palette uses.
 */
export function alpha(color: string, a: number): string {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const m = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})`;
  throw new Error(`dockMaterial: cannot recolour "${color}"`);
}

/**
 * The same colour at zero alpha. A resting route has no fill, and blending it
 * to one has to move alpha alone — interpolating from a named `transparent`
 * drags the mid-frames through black.
 */
export const clear = (color: string): string => alpha(color, 0);
