import { HIT_PX } from './config';
import { dist2 } from './geometry';
import type { Point, Star } from './types';

/**
 * Index of the nearest star within HIT_PX of a point, or -1. The reach is converted from px to world
 * units, so the tap target stays the same size on screen at any zoom.
 *
 * Takes the point already converted rather than a camera and a viewport, because stars live in
 * deck-local coordinates now: the caller knows which deck it is testing and therefore knows the
 * offset, and pushing that in here would mean teaching picking about the layout.
 *
 * Picking runs against coordinates rather than the DOM, which keeps the painted stars inert
 * (`pointer-events: none`) and means every renderer picks the same way — no invisible hit shapes,
 * and no fight between click retargeting and the pointer capture that pan relies on.
 */
export const pickStar = (stars: Star[], p: Point, zoom: number): number => {
  const reach = (HIT_PX / zoom) ** 2;

  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < stars.length; i++) {
    const d = dist2(stars[i], p);
    if (d <= reach && d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
};
