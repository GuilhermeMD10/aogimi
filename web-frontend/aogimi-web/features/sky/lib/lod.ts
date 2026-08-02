import { CLOUD_ZOOM, HANDOVER_BAND, LABEL_BAND, LABEL_ZOOM } from './config';
import { clamp01 } from './geometry';

/**
 * Which of a deck's three layers are up at a given zoom, and how strongly. Pure numbers: what to
 * do with them is the renderer's business, and skipping a layer whose weight is at the floor is
 * where the saving comes from.
 *
 * This crossfade governs the view **inside a focused deck** — the outer view runs on the star
 * budget in `cluster.ts` instead, because out there the unit is a whole deck and a shared zoom
 * threshold is exactly what equalising decks of different sizes has to avoid. Inside one deck the
 * threshold is honest again: it is pinned to the screen-px gap between neighbouring stars
 * (HANDOVER_GAP_PX), which is the same promise at every deck size, and a deck small enough to read
 * never clouds at all.
 */

export type SkyLayers = {
  cloudOp: number;
  lineOp: number;
  starOp: number;
  /** The reading the layers are currently giving, derived from the three numbers above. */
  phase: SkyPhase;
};

export type SkyPhase = 'clouds' | 'crossing' | 'stars' | 'hidden';

/** Every layer up, which is what the outer view runs at: its fading is the budget's, not a zoom's. */
export const SKY_FULL: SkyLayers = { cloudOp: 1, lineOp: 1, starOp: 1, phase: 'stars' };

/** Below this a layer contributes nothing, so it is not built at all. */
export const MIN_LAYER_OP = 0.01;

/**
 * Where this zoom sits in the handover: 0 at CLOUD_ZOOM, 1 a full HANDOVER_BAND factor past it,
 * negative below. In log space, because zoom is multiplicative — a linear measure would make the
 * crossfade crawl when zoomed out and snap when zoomed in.
 */
const progressAt = (zoom: number) => Math.log(zoom / CLOUD_ZOOM) / Math.log(HANDOVER_BAND);

const ramp = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/**
 * The order is the whole effect: the cloud thins out, the lines come up through what is left of
 * it, and only then do the stars land. Lines leading stars is what makes the handover read as a
 * drawing emerging rather than as one layer being swapped for another.
 *
 * All three are functions of zoom and nothing else, so they land on the same frame as the viewBox.
 * Do not put a CSS transition on anything driven from here: the value is already moving with the
 * gesture, and a transition would only make it lag behind the geometry.
 */
export const layersAt = (zoom: number): SkyLayers => {
  const p = progressAt(zoom);
  return layersOf(1 - ramp(p, -0.35, 0.45), ramp(p, -0.15, 0.65), ramp(p, 0.1, 0.85));
};

/**
 * How strongly the per-star front-text labels are up at this zoom: 0 a LABEL_BAND factor below
 * LABEL_ZOOM, 1 at it. Log space for the same reason the handover is — the wheel is exponential,
 * so only a factor covers the same slice of the fade per notch at every scale. A fourth layer in
 * all but name, kept out of SkyLayers because it exists only inside a focused deck and no phase
 * reading depends on it.
 */
export const labelOpAt = (zoom: number) => clamp01(Math.log(zoom / LABEL_ZOOM) / Math.log(LABEL_BAND) + 1);

/** The phase is a reading of the three weights, so it can never disagree with them. */
export const layersOf = (cloudOp: number, lineOp: number, starOp: number): SkyLayers => ({
  cloudOp,
  lineOp,
  starOp,
  phase:
    cloudOp <= MIN_LAYER_OP && lineOp <= MIN_LAYER_OP && starOp <= MIN_LAYER_OP
      ? 'hidden'
      : cloudOp > 0.85
        ? 'clouds'
        : starOp > 0.85
          ? 'stars'
          : 'crossing',
});
