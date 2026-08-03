'use client';
import { useMemo } from 'react';

import { viewBounds } from '../lib/camera';
import { CULL_SLACK } from '../lib/config';
import { type SkyLayout, layoutDecks } from '../lib/layout';
import type { RankRamp } from '../lib/palette';
import { type SkyFrame, type SkyIndex, indexSky, skyFrame } from '../lib/tiers';
import type { Bounds, Camera, FocusPath, SkySnapshot, View } from '../lib/types';

/**
 * The sky's two halves, kept apart because one of them must not pay for the other.
 *
 * `useSkyStage` is everything the camera needs to exist: the trees, the deck arrangement, and the
 * world box the camera may not leave. It depends on the data and the focus, never on the camera —
 * which is also why it is a separate hook rather than one return value. The camera cannot be created
 * until its bounds are known, and its bounds must not be recomputed because it moved.
 *
 * `useSkyDraw` is the per-frame half. It depends on the camera, and it is O(visible nodes + visible
 * stars) rather than O(the sky).
 *
 * Rebuilding a quadtree when the camera moves is the single mistake that undoes the whole feature,
 * and the shape of this file is what makes that mistake hard to write by accident.
 */

export type SkyStage = {
  index: SkyIndex;
  layout: SkyLayout;
  /** The world box the camera is confined to at this focus: every deck, or the focused one. */
  bounds: Bounds;
};

/**
 * `ranks` is the active hue preset's ramp. It belongs to the data half rather than the per-frame
 * one: a cloud's tint is blended from the ranks of the stars it hides, and those aggregates are
 * baked into the quadtrees. So a hue switch re-indexes once (~26ms at the 5000-card quota) and
 * every frame after it is as cheap as before — the alternative, tinting inside `cloudFrame`, would
 * move that cost onto every frame of every pan.
 */
export function useSkyStage(sky: SkySnapshot, focus: FocusPath, ranks: RankRamp): SkyStage {
  const { stars, links, constellations, decks } = sky;

  const index = useMemo(
    () => indexSky({ stars, links, constellations, decks }, ranks),
    [stars, links, constellations, decks, ranks],
  );
  const layout = useMemo(() => layoutDecks(index.localBoxes, index.names), [index]);

  // focusing a deck is what shrinks the camera's world: pan is confined to that deck's own box, so
  // you can look around inside it and cannot wander off into a neighbour
  const focusedDid = focus.length ? focus[0] : null;
  const bounds = useMemo(
    () => (focusedDid === null ? layout.bounds : (layout.places.get(focusedDid)?.box ?? layout.bounds)),
    [layout, focusedDid],
  );

  return { index, layout, bounds };
}

/** Everything a cached frame was computed under. Any of it changing invalidates the frame; the
 *  view alone does not, so long as it stays inside the box the frame was culled against. */
type FrameCache = {
  layout: SkyLayout;
  focus: FocusPath;
  zoom: number;
  hidden: boolean;
  /** The slack box the frame was culled against — the hysteresis band. */
  box: Bounds;
  frame: SkyFrame;
};

/**
 * Keyed on the index rather than held in a ref, for two reasons. The honest one: this cache is
 * read and written during render, which is fine for an idempotent memo (recomputing writes an
 * equivalent entry, nothing else observes it) but is exactly what refs are linted against. The
 * structural one: the index *is* the natural cache key — a frame can only ever be reused for the
 * data it was computed from, and the WeakMap lets a superseded index carry its cached frame to the
 * garbage collector with it.
 */
const frameCache = new WeakMap<SkyIndex, FrameCache>();

const within = (inner: Bounds, outer: Bounds) =>
  inner.minX >= outer.minX && inner.minY >= outer.minY && inner.maxX <= outer.maxX && inner.maxY <= outer.maxY;

/**
 * The per-frame half, with a hysteresis band around it: the frame is culled against a box
 * CULL_SLACK larger than the view, and a pan that stays inside that box returns the *same frame
 * object* rather than an equal one. Identity is the point — every memoised layer downstream
 * compares by reference, so a pure-pan frame costs no recompute, no reconciliation, nothing but
 * the viewBox attribute changing.
 *
 * Zoom is deliberately part of the cache key rather than the band: the LOD is a function of zoom,
 * so a zoom step genuinely changes what exists and must recompute. Panning never does.
 */
export function useSkyDraw(
  stage: SkyStage,
  focus: FocusPath,
  camera: Camera,
  view: View,
  hidden = false,
): SkyFrame {
  const { index, layout } = stage;

  const last = frameCache.get(index);
  if (
    last &&
    last.layout === layout &&
    last.focus === focus &&
    last.zoom === camera.zoom &&
    last.hidden === hidden &&
    within(viewBounds(view), last.box)
  ) {
    return last.frame;
  }

  const box = viewBounds(view, CULL_SLACK);
  const frame = skyFrame({ index, layout, focus, zoom: camera.zoom, view: box, hidden });
  frameCache.set(index, { layout, focus, zoom: camera.zoom, hidden, box, frame });
  return frame;
}
