import {
  BEAD_MIN_CORE_PX,
  CORE_SCALE,
  FOCUSED_STAR_PEAK_SCALE,
  FOCUSED_STAR_SCALE,
  FULCRAL_SCALE,
  ORBIT_RX,
  ORBIT_RY,
  ORBIT_TILT,
  ORBIT_WIDTH,
  RING_BASE,
  RING_MAX,
  RING_STEP,
  RING_WIDTH,
  RING_WIDTH_MIN,
  SATELLITE_R,
  SATELLITE_R_MIN,
  SATELLITE_X,
  SATELLITE_Y,
  SMALL_DECK_MAX,
  SMALL_DECK_STAR_BOOST,
  STAR_GLOW_SCALE,
  STAR_ZOOM_EXPONENT,
  UNFOCUSED_STAR_SCALE,
} from './config';
import { clamp01 } from './geometry';
import { RANK_GLOW, RANK_R_PX, rankOf } from './palette';

/**
 * How a star is *shaped*, as opposed to what colour it is. Here rather than in the renderer because
 * every host needs the same answer and none of it is SVG's business: a Skia or Canvas host wants the
 * identical radii and ring counts, and if each platform kept its own copy the two would drift on the
 * one thing this directory exists to keep equal.
 *
 * **The rank glyph is a count of rings**, one ripple outward per rank step, capped at two with the
 * orbit as the mastered rank's fourth state (see RING_MAX). It replaced a
 * `dot · dot · cross · sparkle` vocabulary whose first two entries were the same shape — so the
 * ladder now actually delivers the four distinguishable states it always claimed.
 */

/** How many signal rings a rank wears: 0 · 1 · 2 · 2. */
export const ringsOf = (mastery: number): number => Math.min(rankOf(mastery), RING_MAX);

/** Whether this rank earns the orbit and satellite — the mastered rank alone. */
export const hasOrbit = (mastery: number): boolean => rankOf(mastery) === 3;

/** Strength of the soft glow behind a star (guide §2, per rank). */
export const glowOf = (mastery: number) => RANK_GLOW[rankOf(mastery)];

export type StarSizing = {
  /** Zoom relative to the tier's fitted view — 1.0 at fit. See STAR_ZOOM_EXPONENT. */
  relZoom: number;
  /** Whether this star's deck is the focused one. An unfocused deck's stars carry less ink. */
  focused?: boolean;
  /**
   * The relZoom this tier can zoom no further than — what the focused deck's size ramp is anchored
   * to (see FOCUSED_STAR_PEAK_SCALE). Omitted, or ≤ 1, means the resting scale at every zoom, which
   * is the old flat behaviour and the right degradation for a host that cannot say.
   */
  relZoomMax?: number;
  /** A fulcral star stands in for a whole collapsed group, so it is drawn larger than a lone one. */
  fulcral?: boolean;
  /** The deck's own multiplier — `deckPresence().scale` at the chooser, 1 everywhere else. */
  scale?: number;
};

/**
 * The focused deck's scale at this zoom: the resting scale at its fit, the peak at its own ceiling.
 *
 * Log space, because zoom is multiplicative — measured linearly the growth would all arrive in the
 * last stretch of the wheel on a deck with a high ceiling and be over immediately on one with a low
 * ceiling, when the point is that both feel like the same journey.
 */
const focusedScale = (relZoom: number, relZoomMax?: number): number => {
  if (!relZoomMax || relZoomMax <= 1) return FOCUSED_STAR_SCALE;
  const t = clamp01(Math.log(Math.max(relZoom, 1)) / Math.log(relZoomMax));
  return FOCUSED_STAR_SCALE + (FOCUSED_STAR_PEAK_SCALE - FOCUSED_STAR_SCALE) * t;
};

/**
 * How much presence a deck's stars are given at the **outer view**, from its card count alone: a
 * size multiplier and whether they are drawn lit rather than as faint context. See SMALL_DECK_MAX
 * for why the smallest decks need both.
 *
 * A pure function of the count, so the chooser cannot end up with two decks of the same size drawn
 * differently, and the focused tier can ignore it entirely (its stars are already lit and already
 * carry FOCUSED_STAR_SCALE).
 */
export const deckPresence = (cards: number): { scale: number; vivid: boolean } => {
  if (cards > SMALL_DECK_MAX || cards <= 0) return { scale: 1, vivid: false };
  // reaches 1 at SMALL_DECK_MAX + 1, so the boundary has no step in it
  const t = (SMALL_DECK_MAX + 1 - cards) / SMALL_DECK_MAX;
  return { scale: 1 + (SMALL_DECK_STAR_BOOST - 1) * t, vivid: true };
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
  // anchors so they carry more ink (and more still the further in you go — see focusedScale); an
  // unfocused deck's carry less; a host that says nothing (focused undefined) gets the neutral base,
  // which is what the outer view's 0.86 is relative to
  const deck =
    s.focused === false
      ? UNFOCUSED_STAR_SCALE
      : s.focused === true
        ? focusedScale(s.relZoom, s.relZoomMax)
        : 1;
  return base * swell * deck * (s.scale ?? 1) * (s.fulcral ? FULCRAL_SCALE : 1);
};

/** The glow's radius, given the star's own. */
export const glowRadius = (rPx: number) => rPx * STAR_GLOW_SCALE;

/**
 * The signal rings' radii in screen px, innermost first — `RING_BASE + RING_STEP·n`. Empty for the
 * new rank, which is the point: a bare bead is a state, not the absence of one.
 */
export const ringRadii = (rPx: number, mastery: number): number[] => {
  const n = ringsOf(mastery);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rPx * (RING_BASE + RING_STEP * i));
  return out;
};

/** Ring stroke width in screen px. Floored, so a hairline never thins out of existence. */
export const ringWidth = (rPx: number) => Math.max(RING_WIDTH_MIN, rPx * RING_WIDTH);

/** Cheap because the tilt is a module constant — resolved once, not per star per frame. */
const TILT_COS = Math.cos((ORBIT_TILT * Math.PI) / 180);
const TILT_SIN = Math.sin((ORBIT_TILT * Math.PI) / 180);

/**
 * The mastered rank's orbit, in screen px.
 *
 * The satellite's seat is returned **already rotated** through `ORBIT_TILT`, so the renderer needs
 * no wrapping `<g transform>`: the ellipse carries the rotation itself and the satellite is a plain
 * circle at baked coordinates. That is one fewer node and one fewer transform per gold star, and it
 * keeps the tilt derived from a single constant rather than stated twice.
 */
export const orbitOf = (rPx: number) => ({
  rx: rPx * ORBIT_RX,
  ry: rPx * ORBIT_RY,
  tilt: ORBIT_TILT,
  width: ORBIT_WIDTH,
  satX: rPx * (SATELLITE_X * TILT_COS - SATELLITE_Y * TILT_SIN),
  satY: rPx * (SATELLITE_X * TILT_SIN + SATELLITE_Y * TILT_COS),
  satR: Math.max(SATELLITE_R_MIN, rPx * SATELLITE_R),
});

/**
 * The core's radius in screen px. One law for every rank now — nothing hides its core behind a
 * solid body any more, and CORE_SCALE explains why it is not the full radius.
 */
export const coreRadius = (rPx: number) => rPx * CORE_SCALE;

/**
 * Whether the glass bead's six layers can actually resolve at this core size, given in **screen px**
 * (not world units — the whole judgement is about pixels the reader can see). Below the gate the
 * star draws the flat core and specular instead. See BEAD_MIN_CORE_PX for why the gate exists and
 * why it costs so little to leave open above it.
 */
export const beadResolves = (corePx: number) => corePx >= BEAD_MIN_CORE_PX;
