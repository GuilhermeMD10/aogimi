import type { Bounds, Point, Star } from './types';

export const ORIGIN: Point = { x: 0, y: 0 }; // the sky grows outward from the first card

export const dist2 = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** The shared layer's only clamp. Lived in three files before, once per shape it was needed in. */
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);

const orient = (a: Point, b: Point, c: Point) =>
  Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));

/** True if segments ab and cd intersect. Collinear touches count as crossing (conservative). */
export const segmentsCross = (a: Point, b: Point, c: Point, d: Point) => {
  const d1 = orient(c, d, a);
  const d2 = orient(c, d, b);
  const d3 = orient(a, b, c);
  const d4 = orient(a, b, d);
  return d1 !== d2 && d3 !== d4;
};

/** Shortest distance from p to segment ab. */
export const pointToSegment = (p: Point, a: Point, b: Point) => {
  const len2 = dist2(a, b);
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp01(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2);
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
};

/**
 * The sky's edge: what a fit frames, and what pan is not allowed to leave. Centred on the middle
 * of the stars' own extent, so an off-centre sky is framed rather than the origin.
 *
 * Each axis is sized independently, so the box hugs its content instead of being squared up to
 * its longer side. fitZoom takes the smaller of the two axis ratios, which covers the whole box
 * whatever shape the viewport is, so squaring here would only pad the boundary with void.
 *
 * @param pad     world units of margin beyond the outermost star
 * @param minSide smallest either side may be, so a nearly empty sky is not framed absurdly close
 */
export const skyBounds = (stars: Star[], pad: number, minSide: number): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of stars) {
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
  }
  if (!stars.length) {
    minX = maxX = minY = maxY = 0;
  }

  const halfX = Math.max(minSide, maxX - minX + 2 * pad) / 2;
  const halfY = Math.max(minSide, maxY - minY + 2 * pad) / 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { minX: cx - halfX, minY: cy - halfY, maxX: cx + halfX, maxY: cy + halfY };
};

/* ---------- culling ---------- */
/**
 * The three tests that decide whether a thing is worth drawing. All inclusive, so something
 * exactly on the edge is kept: over-drawing by a pixel is free, and a shape wrongly culled at the
 * boundary is a visible hole.
 */

export const inBounds = (p: Point, b: Bounds) =>
  p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;

export const boundsCross = (a: Bounds, b: Bounds) =>
  a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

/**
 * Conservative: it tests the segment's own box rather than the segment, so a link whose box
 * clips the corner of the view survives even when the link itself does not. Cheap, and the cost
 * of being wrong is one line drawn just off screen rather than one missing.
 */
export const segmentInBounds = (a: Point, b: Point, box: Bounds) =>
  Math.max(a.x, b.x) >= box.minX &&
  Math.min(a.x, b.x) <= box.maxX &&
  Math.max(a.y, b.y) >= box.minY &&
  Math.min(a.y, b.y) <= box.maxY;
