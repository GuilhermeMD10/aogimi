import { HALO_ALPHA } from './config';

/** Golden angle around the hue wheel, so consecutive constellation ids never look alike. */
export const hueFor = (i: number) => `hsl(${(i * 137.5) % 360} 65% 78%)`;

/**
 * The four mastery ranks, from the reference's Midnight palette (agglomeration guide §2/§9). Rank
 * drives colour, radius, glow strength and silhouette — the silhouette change is the important
 * part: you can read a star's rank from its shape alone, colourblind or at 20% opacity, and the
 * colour says the same thing a second time for readers who can use it.
 *
 *   0 · New       #7E78E0   bare dot
 *   1 · Recent    #A98BFF   bare dot
 *   2 · Learned   #FF7AC4   dot + 4-arm cross
 *   3 · Mastered  #F4DC82   single four-point sparkle
 */
export const RANKS = 4;
export const RANK_COLORS = ['#7E78E0', '#A98BFF', '#FF7AC4', '#F4DC82'];
/**
 * Base screen radius per rank, before the zoom swell — the guide's `rank.r` (4.2…7.6) at 55%.
 * These are the sizes the condensed views draw at, and the *same* sizes every other view starts
 * from: the zoom swell is the only thing that grows a star, so there is no point in the gesture
 * where stars snap to a different size law.
 */
export const RANK_R_PX = [2.3, 2.9, 3.5, 4.2];
/** Glow strength per rank (guide §2, `rank.glow`). The opacity maths scales from these. */
export const RANK_GLOW = [0.1, 0.14, 0.2, 0.26];

/** What the panel calls each rank. Index by `rankOf`; shown to readers as "rank n+1 of 4". */
export const RANK_LABELS = ['New', 'Recent', 'Learned', 'Mastered'];

/** Constellation lines, per the guide's night palette (`T.line`). */
export const LINE_COLOR = '#8fa0bb';

/** Star labels, per the night palette (`T.starlabel`) — legible over the sky, dimmer than a star. */
export const STAR_LABEL_COLOR = '#cfd8ea';

/** The selection ring. The reference's button gold, so it reads as chrome rather than as a rank. */
export const SELECT_COLOR = '#ffe085';

/** A rank pinned to the vocabulary, however the caller got the number. */
export const rankOf = (mastery: number) => Math.min(RANKS - 1, Math.max(0, Math.round(mastery)));

/**
 * A colour snapped to 16 levels per channel, and a share snapped to quarters — the resolution the
 * cloud gradients are *keyed* at. Blended tints are continuous, so left alone every lobe mints its
 * own gradient def; snapped, lobes with near-identical tints share one. For a soft radial fill 16
 * levels is beneath what the eye separates, so the def count collapses (O(lobes) → a few dozen for
 * the whole sky) and the look does not move.
 */
export const quantiseColor = (hex: string): string => {
  const q = (at: number) =>
    (Math.round(parseInt(hex.slice(at, at + 2), 16) / 17) * 17).toString(16).padStart(2, '0');
  return `#${q(1)}${q(3)}${q(5)}`;
};

const quantiseShare = (share: number) => Math.round(share * 3) / 3;

/** The quantised form of a tint — what a shared gradient def is built from and keyed on. */
export const quantiseTint = (t: GroupTint): GroupTint => ({
  body: quantiseColor(t.body),
  peak: t.peak, // already one of RANK_COLORS
  peakShare: quantiseShare(t.peakShare),
});

/** A def id fragment for the quantised tint: unique exactly when the gradient would differ. */
export const tintKey = (t: GroupTint) =>
  `${quantiseColor(t.body).slice(1)}-${t.peak.slice(1)}-${Math.round(quantiseShare(t.peakShare) * 3)}`;

export const starColor = (mastery: number) => RANK_COLORS[rankOf(mastery)];

const RANK_RGB = RANK_COLORS.map((hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]);

/**
 * A cloud stands in for many stars, so its colour has to stand in for many ranks.
 *
 * The share each rank holds is raised to a power before mixing. A plain average drags every cloud
 * to the middle of the palette and they all come out the same mauve; the exponent lets the majority
 * rank actually show, so a mastered deck burns gold and a young one stays violet. Raise it if
 * clouds look alike, lower it if they look posterised.
 */
const TINT_EXPONENT = 2.6;

/**
 * The two low ranks are the visually faintest and the exponent would otherwise erase them from the
 * blend — every cloud would converge to gold the moment it held a few mastered cards. The boosts
 * let the low-rank crowd show through (guide §6.3).
 */
const RANK_BOOST = [1.45, 1.3, 1, 1];

/**
 * The colours a group of cards is drawn from. Two, because one is not enough to be honest about a
 * mixed group: `body` is what most of the cards are, `peak` is the furthest any of them has got.
 * A group holding one mastered card among forty fresh ones reads as a small warm core in a pale
 * body, which a single blended colour flattens away entirely.
 *
 * `peakShare` is how much of the group has reached that furthest rank, so the renderer can size
 * the core by it: one mastered card earns a glint, half of them earn a whole warm centre.
 */
export type GroupTint = { body: string; peak: string; peakShare: number };

export const groupTint = (hist: number[]): GroupTint => {
  let total = 0;
  let peak = 0;
  for (let i = 0; i < hist.length; i++) {
    total += hist[i];
    if (hist[i] > 0) peak = i;
  }
  return {
    body: mix(hist, total),
    peak: RANK_COLORS[peak],
    peakShare: total ? hist[peak] / total : 0,
  };
};

/** The blend itself, given a total the caller has already counted. */
const mix = (hist: number[], total: number): string => {
  if (!total) return RANK_COLORS[0];

  let weight = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < hist.length; i++) {
    if (!hist[i]) continue;
    const w = ((hist[i] * (RANK_BOOST[i] ?? 1)) / total) ** TINT_EXPONENT;
    weight += w;
    r += w * RANK_RGB[i][0];
    g += w * RANK_RGB[i][1];
    b += w * RANK_RGB[i][2];
  }
  const hex = (v: number) => Math.round(v / weight).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
};

/**
 * How a cloud form is shaded, as offset/colour/alpha triples from centre to rim.
 *
 * Here rather than in the renderer because it is the one part of the cloud's look that is not
 * SVG's business: a Canvas or Skia host feeds exactly these numbers to `createRadialGradient`, and
 * if each platform kept its own copy the two would drift on the thing lib/sky exists to keep equal.
 */
export type ColorStop = { at: number; color: string; alpha: number };

/**
 * Peak colour at the centre, body colour through the middle, transparent at the rim. The core's
 * width runs with `peakShare`, so one mastered card among forty shows a small bright glint and
 * a group where most have shows a broad warm centre.
 */
export const lobeStops = (t: GroupTint): ColorStop[] => [
  { at: 0, color: t.peak, alpha: 0.62 },
  { at: 0.1 + 0.26 * t.peakShare, color: t.body, alpha: 0.34 },
  { at: 0.55, color: t.body, alpha: 0.14 },
  { at: 1, color: t.body, alpha: 0 },
];

/** The glow that binds a group's lobes. Shape fixed, strength all from HALO_ALPHA. */
export const haloStops = (t: GroupTint): ColorStop[] => [
  { at: 0, color: t.body, alpha: HALO_ALPHA },
  { at: 0.45, color: t.body, alpha: HALO_ALPHA * 0.36 },
  { at: 1, color: t.body, alpha: 0 },
];

/** The gold hot core: the mastered knot glinting at its own position inside a cloud (guide §6.4).
 *  Takes the peak colour rather than assuming gold, so it stays honest if the palette is swapped. */
export const hotStops = (color: string): ColorStop[] => [
  { at: 0, color, alpha: 0.4 },
  { at: 0.55, color, alpha: 0.09 },
  { at: 1, color, alpha: 0 },
];
