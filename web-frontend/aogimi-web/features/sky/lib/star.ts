import {
  CROSS_INNER,
  CROSS_OUTER,
  FOCUSED_STAR_SCALE,
  FULCRAL_SCALE,
  SPARKLE_ARM,
  SPARKLE_CORE,
  SPARKLE_WAIST,
  STAR_GLOW_SCALE,
  STAR_ZOOM_EXPONENT,
  UNFOCUSED_STAR_SCALE,
} from './config';
import { RANK_GLOW, RANK_R_PX, rankOf } from './palette';

/**
 * How a star is *shaped*, as opposed to what colour it is. Here rather than in the renderer because
 * every host needs the same answer and none of it is SVG's business: a Skia or Canvas host wants the
 * identical radii and arm lengths, and if each platform kept its own copy the two would drift on the
 * one thing this directory exists to keep equal.
 *
 * The mastered sparkle is a **single** four-point form, points on the axes. It used to be two,
 * the second rotated 45° underneath for an eight-armed glint — removed on purpose: over a crowded
 * field the eight slender arms read as clutter, where one solid four-point body reads as a shape.
 */

/** What a star is drawn as, by rank: 0/1 a bare dot, 2 a crossed dot, 3 the four-point sparkle. */
export type Silhouette = 'dot' | 'cross' | 'sparkle';

export const silhouetteOf = (mastery: number): Silhouette => {
  const k = rankOf(mastery);
  return k === 3 ? 'sparkle' : k === 2 ? 'cross' : 'dot';
};

/** Strength of the soft glow behind a star (guide §2, per rank). */
export const glowOf = (mastery: number) => RANK_GLOW[rankOf(mastery)];

export type StarSizing = {
  /** Zoom relative to the tier's fitted view — 1.0 at fit. See STAR_ZOOM_EXPONENT. */
  relZoom: number;
  /** Whether this star's deck is the focused one. An unfocused deck's stars carry less ink. */
  focused?: boolean;
  /** A fulcral star stands in for a whole collapsed group, so it is drawn larger than a lone one. */
  fulcral?: boolean;
};

/**
 * A star's radius **in screen px**, which is what the renderer converts to world units through
 * `View.worldPerPx`. Screen px is the only currency that makes sense here: the point of the
 * sublinear exponent is that a star's size on the reader's screen is a controlled quantity rather
 * than something the world scale drags around.
 */
export const starRadiusPx = (mastery: number, s: StarSizing): number => {
  const base = RANK_R_PX[rankOf(mastery)];
  const swell = Math.pow(Math.max(s.relZoom, 1e-6), STAR_ZOOM_EXPONENT);
  // three deck standings, three scales: the focused interior's stars are click targets and label
  // anchors so they carry more ink; an unfocused deck's carry less; a host that says nothing
  // (focused undefined) gets the neutral base, which is what the outer view's 0.86 is relative to
  const deck = s.focused === false ? UNFOCUSED_STAR_SCALE : s.focused === true ? FOCUSED_STAR_SCALE : 1;
  return base * swell * deck * (s.fulcral ? FULCRAL_SCALE : 1);
};

/** The glow's radius, given the star's own. */
export const glowRadius = (rPx: number) => rPx * STAR_GLOW_SCALE;

/** A cross-armed star's four arms, as inner/outer offsets along each axis. */
export const CROSS_ARMS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const crossArm = (rPx: number) => ({ inner: rPx * CROSS_INNER, outer: rPx * CROSS_OUTER });

/**
 * The four-point star, as four quadratic segments around the origin. `lv`/`lh` are the vertical and
 * horizontal arm lengths, `w` the waist half-width.
 *
 * The control offset `c` runs with the waist and against the arms: a wide waist next to short arms
 * keeps it positive and the sides only gently concave — the fat solid body the mastered rank wears —
 * while letting it go negative pinches the waist into slender arms. Do not clamp it.
 */
export const sparklePath = (lv: number, lh: number, w: number): string => {
  const c = Math.SQRT2 * w - 0.25 * (lv + lh);
  return `M0 ${-lv}Q${c} ${-c} ${lh} 0Q${c} ${c} 0 ${lv}Q${-c} ${c} ${-lh} 0Q${-c} ${-c} 0 ${-lv}Z`;
};

/** The mastered form's measurements, from the star's own radius. One layer — see the header note. */
export const sparkleOf = (rPx: number) => ({ arm: rPx * SPARKLE_ARM, waist: rPx * SPARKLE_WAIST });

/** A sparkle's core dot is hidden inside its body; this sizes what hangs off it (the specular). */
export const coreRadius = (rPx: number, form: Silhouette) => (form === 'sparkle' ? rPx * SPARKLE_CORE : rPx);
