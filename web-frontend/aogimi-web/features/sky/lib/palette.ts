import { HALO_ALPHA } from './config';

/** Golden angle around the hue wheel, so consecutive constellation ids never look alike. */
export const hueFor = (i: number) => `hsl(${(i * 137.5) % 360} 65% 78%)`;

/**
 * The four mastery ranks. Rank drives colour, radius, glow strength and silhouette — the
 * silhouette change is the important part: you can read a star's rank from its shape alone,
 * colourblind or at 20% opacity, and the colour says the same thing a second time for readers who
 * can use it. Only the *colour* is a preset (see SKY_PALETTES); radius, glow and silhouette are the
 * same in every sky, because they carry meaning.
 *
 *   0 · New       bare dot
 *   1 · Recent    bare dot
 *   2 · Learned   dot + 4-arm cross
 *   3 · Mastered  single four-point sparkle
 *
 * The reference's own colours (guide §2/§9) are the `default` preset below.
 */
export const RANKS = 4;

/** The four rank colours of one sky, low rank first. Exactly RANKS long, by type. */
export type RankRamp = readonly [string, string, string, string];

/* ---------- the hue presets ---------- */

/**
 * Which sky the reader picked. Four flat palettes, **not** theme-derived: one hex per rank per
 * preset, used in both light and dark theme everywhere the mastery ladder is drawn — the star map,
 * the ledger dots, the progress gradients. Unifying in the sky's favour was the decision (see
 * DECISIONS.md): the chrome follows the sky rather than the sky following the chrome, which is why
 * `--stage-mastered` no longer has a per-theme value.
 *
 * The web mirror of these values is the `html[data-sky-hue="…"]` blocks in `styles/ds-tokens.css` —
 * change one, change both, exactly like `rankProgress.ts` ↔ `cardSrsService.js`.
 */
export type SkyHue = 'default' | 'ginga' | 'ember' | 'aurora';

export const DEFAULT_SKY_HUE: SkyHue = 'default';

/** Every preset, in the order a picker offers them. */
export const SKY_HUES: readonly SkyHue[] = ['default', 'ginga', 'ember', 'aurora'];

/**
 * One sky's colours, and *only* its colours. A preset never touches radius, glow, silhouette or
 * placement: swapping hue must repaint the sky without moving a single star or changing what a
 * shape means.
 */
export type SkyPalette = {
  id: SkyHue;
  label: string;
  /** New, Recent, Learned, Mastered. */
  ranks: RankRamp;
  /** Constellation lines. */
  line: string;
  /** What the canvas's background gradient is tinted with, over the near-black base. */
  tint: string;
};

export const SKY_PALETTES: Record<SkyHue, SkyPalette> = {
  default: {
    id: 'default',
    label: 'Aogimi',
    ranks: ['#7E78E0', '#A98BFF', '#FF7AC4', '#F4DC82'],
    line: '#8fa0bb',
    tint: '#7E78E0',
  },
  ginga: {
    id: 'ginga',
    label: 'Ginga silver',
    ranks: ['#48545C', '#8494A0', '#DCE6EC', '#E0A448'],
    line: '#6f7d85',
    tint: '#2D373B',
  },
  ember: {
    id: 'ember',
    label: 'Ember dusk',
    ranks: ['#4B316F', '#83405C', '#C25A45', '#F0A13C'],
    line: '#8a6f9e',
    tint: '#2E2B64',
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora field',
    ranks: ['#5E324D', '#A863A8', '#DCD0E4', '#52D46A'],
    line: '#9d7fa0',
    tint: '#5E324D',
  },
};

/** The default preset's ramp, for callers that have no palette in hand (the demo harness, and the
 *  `--stage-*` fallback the CSS mirrors). Everything on the drawing path takes its ramp as an
 *  argument instead, so a hue switch is visible to React's dependency graph. */
export const RANK_COLORS: RankRamp = SKY_PALETTES.default.ranks;

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

/** Constellation lines of the `default` preset (the guide's `T.line`). Every preset carries its
 *  own — the drawing path reads `palette.line`, not this. */
export const LINE_COLOR = SKY_PALETTES.default.line;

/** Star labels, per the night palette (`T.starlabel`) — legible over the sky, dimmer than a star.
 *  Preset-independent: text is chrome, and the sky is night under every hue. */
export const STAR_LABEL_COLOR = '#cfd8ea';

/**
 * The deck card frames' chrome — the handover's night-theme `frameFill`/`frameBd`, `decklabel`
 * and `gold`. Preset-independent for the same reason STAR_LABEL_COLOR is: the frame is chrome,
 * and the sky is night under every hue and in both themes, so its glass is always faint white on
 * near-black. Same standing hex exception the rest of this file carries. The gold pair (the due
 * pill's fill and edge) is precomputed here rather than derived, so the renderer never parses a
 * hex per frame.
 */
export const FRAME_CHROME = {
  fill: 'rgba(255, 255, 255, 0.035)',
  fillHover: 'rgba(255, 255, 255, 0.075)',
  bd: 'rgba(255, 255, 255, 0.16)',
  bdHover: 'rgba(255, 255, 255, 0.40)',
  /** The deck name (`T.decklabel`); the subtitle and counts take STAR_LABEL_COLOR. */
  deckLabel: '#e8edf8',
  gold: '#ffe085',
  goldFill: 'rgba(255, 224, 133, 0.16)',
  goldBd: 'rgba(255, 224, 133, 0.42)',
} as const;

/**
 * The selection ring — white, and preset-independent.
 *
 * It used to be the reference's button gold (#ffe085), which was already a hair off `default`'s
 * mastered rank (#F4DC82) and lands on top of ginga's mastered amber (#E0A448): a gold ring around
 * a gold star stops reading as chrome and starts reading as "this star is more mastered". White is
 * the one value no preset's ramp contains, it is maximum contrast on a near-black sky under every
 * hue, and it joins the chrome family the canvas already draws in white (the bounds rect, the reach
 * ring, the hover readout, the specular highlight) — so selection reads as chrome by company as
 * well as by colour. Distinctness from hover survives too: the hover ring takes the *star's* colour.
 */
export const SELECT_COLOR = '#ffffff';

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
  peak: t.peak, // already one of the palette's ranks
  peakShare: quantiseShare(t.peakShare),
});

/** A def id fragment for the quantised tint: unique exactly when the gradient would differ. */
export const tintKey = (t: GroupTint) =>
  `${quantiseColor(t.body).slice(1)}-${t.peak.slice(1)}-${Math.round(quantiseShare(t.peakShare) * 3)}`;

export const starColor = (mastery: number, ranks: RankRamp) => ranks[rankOf(mastery)];

/** A `#rrggbb` split into channels. Exported because the canvas needs the active tint as an rgb
 *  triple to give it an alpha, and a second parser would be a second place to get it wrong. */
export const rgbOf = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * Channel triples per ramp, cached against the ramp itself.
 *
 * The blend below runs once per quadtree node — thousands of times per data change — and every one
 * of them would otherwise re-parse the same four hexes. Keyed on the ramp array (a module const
 * inside SKY_PALETTES, so reference-stable) and weak, so a caller passing an ad-hoc ramp doesn't
 * leak it.
 */
const rgbCache = new WeakMap<RankRamp, [number, number, number][]>();
const rankRgb = (ranks: RankRamp): [number, number, number][] => {
  const hit = rgbCache.get(ranks);
  if (hit) return hit;
  const rgb = ranks.map(rgbOf);
  rgbCache.set(ranks, rgb);
  return rgb;
};

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

export const groupTint = (hist: number[], ranks: RankRamp): GroupTint => {
  let total = 0;
  let peak = 0;
  for (let i = 0; i < hist.length; i++) {
    total += hist[i];
    if (hist[i] > 0) peak = i;
  }
  return {
    body: mix(hist, total, ranks),
    peak: ranks[peak],
    peakShare: total ? hist[peak] / total : 0,
  };
};

/** The blend itself, given a total the caller has already counted. */
const mix = (hist: number[], total: number, ranks: RankRamp): string => {
  if (!total) return ranks[0];

  const rgb = rankRgb(ranks);
  let weight = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < hist.length; i++) {
    if (!hist[i]) continue;
    const w = ((hist[i] * (RANK_BOOST[i] ?? 1)) / total) ** TINT_EXPONENT;
    weight += w;
    r += w * rgb[i][0];
    g += w * rgb[i][1];
    b += w * rgb[i][2];
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
