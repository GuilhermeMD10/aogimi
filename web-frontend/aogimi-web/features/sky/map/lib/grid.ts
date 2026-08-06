import type { Bounds, Point } from './types';

/** A world-space query or insertion box — the same axis-aligned rectangle `Bounds` describes. */
export type Box = Bounds;

export const pointBox = (p: Point, pad: number): Box => ({
  minX: p.x - pad,
  minY: p.y - pad,
  maxX: p.x + pad,
  maxY: p.y + pad,
});

export const segmentBox = (a: Point, b: Point, pad: number): Box => ({
  minX: Math.min(a.x, b.x) - pad,
  minY: Math.min(a.y, b.y) - pad,
  maxX: Math.max(a.x, b.x) + pad,
  maxY: Math.max(a.y, b.y) + pad,
});

const SPAN = 1 << 15;
const HALF = SPAN >> 1;

/**
 * Cell (cx, cy) -> bucket key. The offset keeps both halves positive for a sky reaching
 * HALF cells from the origin, which is far past anything the generator can produce.
 * Past that, keys begin to collide — which costs a few redundant tests and nothing else,
 * since insertion and lookup hash identically, so a cell's items are never missed.
 */
const keyOf = (cx: number, cy: number) => (cx + HALF) * SPAN + (cy + HALF);

/**
 * Uniform spatial hash. An item is filed in every cell its box touches, and a query visits
 * every item filed in the cells its own box touches.
 *
 * Two deliberate loosenesses keep this small, and neither can change an answer:
 *
 * - A query yields a *superset* of what is genuinely nearby, since a cell reaches beyond the
 *   box that selected it. Every caller re-tests the exact geometry, so extras are rejected;
 *   all the grid has to guarantee is that nothing real is left out.
 * - An item spanning several cells can be yielded more than once. Callers are `some`-style
 *   predicates and nearest-of reductions, both of which are idempotent, so there is no need
 *   for visit bookkeeping.
 */
export class SpatialGrid<T> {
  private cells = new Map<number, T[]>();

  /** @param size cell edge in world units; pick it near the radius you query most. */
  constructor(private readonly size: number) {}

  insert(item: T, box: Box) {
    const s = this.size;
    const x1 = Math.floor(box.maxX / s);
    const y1 = Math.floor(box.maxY / s);
    for (let cx = Math.floor(box.minX / s); cx <= x1; cx++) {
      for (let cy = Math.floor(box.minY / s); cy <= y1; cy++) {
        const key = keyOf(cx, cy);
        const bucket = this.cells.get(key);
        if (bucket) bucket.push(item);
        else this.cells.set(key, [item]);
      }
    }
  }

  /** True as soon as `test` accepts an item near `box`. */
  some(box: Box, test: (item: T) => boolean): boolean {
    const s = this.size;
    const x1 = Math.floor(box.maxX / s);
    const y1 = Math.floor(box.maxY / s);
    for (let cx = Math.floor(box.minX / s); cx <= x1; cx++) {
      for (let cy = Math.floor(box.minY / s); cy <= y1; cy++) {
        const bucket = this.cells.get(keyOf(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) if (test(bucket[i])) return true;
      }
    }
    return false;
  }

  /** Visit every item near `box`, possibly more than once. */
  forEach(box: Box, visit: (item: T) => void) {
    this.some(box, (item) => {
      visit(item);
      return false;
    });
  }

  clear() {
    this.cells.clear();
  }
}
