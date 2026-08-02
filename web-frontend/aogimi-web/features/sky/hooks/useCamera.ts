'use client';
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cameraFitting, clampCamera, fitZoom, matchAspect, panBy, viewOf, zoomAround } from '../lib/camera';
import { DRAG_SLOP_PX, ZOOM_PER_WHEEL_PX } from '../lib/config';
import type { Bounds, Camera, Point, View, Viewport } from '../lib/types';

type Drag = {
  id: number; // the pointer we are following
  from: Point; // where it went down, in viewport px
  cam: Camera; // the pose at that moment; every move is measured from here, so no drift
  moved: boolean; // has it passed DRAG_SLOP_PX yet
};

/**
 * Either a definite pose, or the intent to frame the whole of `bounds`. Keeping "fit" as an intent
 * rather than resolving it to numbers means it re-resolves against whatever the bounds are when read
 * — so fitting right after a build frames the new sky, not the one that was there when the button was
 * pressed, and entering a deck frames that deck without anyone computing a pose for it. It also makes
 * the view follow a sky that is still growing, until you touch it.
 */
type Pose = Camera | 'fit';

/**
 * Stands in for one render, until the ResizeObserver in `attach` reports the element's real size.
 * Any positive size does — it only has to keep the camera maths from dividing by zero — and nothing
 * derived from it survives the first measurement.
 */
const FALLBACK: Viewport = { width: 820, height: 520 };

/**
 * Pointer position within an element, in the same px space the camera measures in. Web-only: the
 * camera itself takes plain numbers, and a native host gets these from its gesture recogniser.
 */
export const localOf = (el: Element, e: { clientX: number; clientY: number }): Point => {
  const rect = el.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export type CameraController = {
  /** Callback ref for the viewport element; owns the wheel listener and the size observer. */
  attach: (el: SVGSVGElement | null) => (() => void) | undefined;
  camera: Camera;
  view: View;
  /** The world box the camera is actually confined to — the given bounds, grown to the viewport's
   *  aspect when `fillViewport` is on. What a boundary drawing must draw, or it lies. */
  bounds: Bounds;
  /** The measured element size the camera is working against. */
  viewport: Viewport;
  dragging: boolean;
  /** Whether the camera is currently immobile. The outer view is, by design. */
  locked: boolean;
  /** How far in the camera is relative to a fit of its current bounds — 1.0 at the fitted view.
   *  What the star form's sublinear swell is measured against, so it means the same at every tier. */
  relZoom: number;
  /** Frame the whole of `bounds`, now and as it grows, until a gesture takes over. */
  fitTo: () => void;
  /** Begin following this pointer. */
  onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void;
  /** Returns true when the move belonged to a pan, so the caller can skip hover work. */
  onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => boolean;
  /** Returns true when the press never became a drag, i.e. it should count as a click. */
  onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => boolean;
};

export type CameraOptions = {
  /**
   * Immobile: no pan, no zoom, always fitted. The outer view is locked because it is a *chooser* —
   * every deck is on screen at once by construction, so there is nothing to pan to and nothing a
   * zoom could reveal that going into a deck does not reveal better.
   */
  locked?: boolean;
  /**
   * Grow the world box to the viewport's aspect ratio before any camera maths sees it, so the
   * fitted view fills the container edge to edge — inside a single deck the boundary *is* the
   * container, rather than a smaller rectangle letterboxed within it. Off at the multi-deck outer
   * view, whose grid earns its own shape.
   */
  fillViewport?: boolean;
  /**
   * Called when a zoom-out is asked for while already fully pulled back. The gesture has nowhere
   * left to go at this tier, which is exactly the moment it should mean "leave" — so backing out of
   * a deck is the same wheel motion that got you around inside it, rather than a separate control.
   */
  onZoomOutFloor?: () => void;
};

/**
 * Owns a pan/zoom camera over an element, and nothing about what is drawn in it. Gestures:
 * left-drag to pan, wheel to zoom about the cursor. `bounds` is the world box the viewport may not
 * leave — the union of every deck at the outer view, one deck's own box inside it — and every path
 * that moves the camera runs through clampCamera.
 *
 * This hook is the web half of the camera. The maths it calls is platform-free; what lives here is
 * the DOM: measuring the element, reading pointer coordinates, and turning a wheel delta into the
 * zoom multiplier the shared code actually wants.
 */
export function useCamera(rawBounds: Bounds, opts: CameraOptions = {}): CameraController {
  const { locked = false, fillViewport = false, onZoomOutFloor } = opts;
  const [pose, setPose] = useState<Pose>('fit');
  const [viewport, setViewport] = useState<Viewport>(FALLBACK);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<Drag | null>(null);

  // resolved once here, so every path below — the clamp, the zoom floor, the gesture handlers
  // reading through the ref — is confined to the same box and none can disagree about the edge
  const bounds = useMemo(
    () => (fillViewport ? matchAspect(rawBounds, viewport) : rawBounds),
    [rawBounds, viewport, fillViewport],
  );

  // bounds grow as the sky does and the viewport changes as the window does, but the listeners
  // are attached once. Reading these through refs keeps them (and the gesture handlers) stable.
  const boundsRef = useRef(bounds);
  const viewportRef = useRef(viewport);
  const lockedRef = useRef(locked);
  const escapeRef = useRef(onZoomOutFloor);
  useEffect(() => {
    boundsRef.current = bounds;
    viewportRef.current = viewport;
    lockedRef.current = locked;
    escapeRef.current = onZoomOutFloor;
  });

  // A locked camera is not a pose that happens to be fitted — it is the *intent* to be fitted, so
  // it keeps re-resolving as the bounds change and cannot be left stale by a gesture that raced it.
  const effective: Pose = locked ? 'fit' : pose;

  // the camera is confined on the way *out* rather than on the way in. Growing the sky only adds
  // slack, but entering a deck shrinks the box under a camera that was legal a moment ago —
  // deriving the clamp here handles that without a correcting render, and guarantees no consumer
  // can ever observe an out-of-bounds camera.
  const camera = useMemo(
    () => clampCamera(effective === 'fit' ? cameraFitting(bounds, viewport) : effective, bounds, viewport),
    [effective, bounds, viewport],
  );
  const view = useMemo(() => viewOf(camera, viewport), [camera, viewport]);
  // relative to a fit of the *current* bounds, so 1.0 means "this tier, fully framed" whether that
  // tier is the whole sky or one deck. An absolute zoom would mean something different in each.
  const relZoom = useMemo(() => camera.zoom / fitZoom(bounds, viewport), [camera.zoom, bounds, viewport]);

  const fitTo = useCallback(() => setPose('fit'), []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      // capture on the viewport, so a drag keeps tracking once the cursor leaves it
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { id: e.pointerId, from: localOf(e.currentTarget, e), cam: camera, moved: false };
      setDragging(true);
    },
    [camera],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return false;

    const local = localOf(e.currentTarget, e);
    const dx = local.x - drag.from.x;
    const dy = local.y - drag.from.y;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_SLOP_PX) drag.moved = true;
    // A locked camera still tracks the press — it has to, or the slop test could never fail and a
    // sloppy click at the outer view would be read as a tap. It simply does not move.
    if (drag.moved && !lockedRef.current) {
      setPose(clampCamera(panBy(drag.cam, dx, dy), boundsRef.current, viewportRef.current));
    }
    return true;
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    // the pointer may already be gone on cancel, and releasing one that is not captured throws
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    setDragging(false);
    return !!drag && !drag.moved;
  }, []);

  const attach = useCallback((el: SVGSVGElement | null) => {
    if (!el) return;

    // the camera works in the element's own px, so it has to know how big that is; a zero
    // measurement is ignored rather than propagated, since it would divide through the maths
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    // wheel has to be a native non-passive listener; React's synthetic one cannot preventDefault
    // reliably, and without that the page scrolls behind the sky
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = boundsRef.current;
      const vp = viewportRef.current;
      // the wheel's own feel is decided here. Exponential, so a notch means the same proportional
      // change at every scale — and it reaches the shared maths as a plain multiplier, which is
      // what lets a pinch gesture drive the identical code path
      const factor = Math.exp(-e.deltaY * ZOOM_PER_WHEEL_PX);

      // Asking to pull back when there is nothing left to pull back to is what leaves a tier. Read
      // off the floor rather than from a click target, so it works the same at whatever depth.
      if (factor < 1) {
        const floor = fitZoom(b, vp);
        setPose((current) => {
          const from = current === 'fit' ? cameraFitting(b, vp) : current;
          if (from.zoom <= floor + 1e-9) {
            escapeRef.current?.();
            return current;
          }
          return clampCamera(zoomAround(from, localOf(el, e), factor, b, vp), b, vp);
        });
        return;
      }

      if (lockedRef.current) return; // the outer view has nothing to zoom into but a deck
      // zoomAround applies the zoom ceiling itself (its pinning maths needs the final zoom);
      // clampCamera then pulls the position back in
      const local = localOf(el, e);
      setPose((current) => {
        const from = current === 'fit' ? cameraFitting(b, vp) : current;
        return clampCamera(zoomAround(from, local, factor, b, vp), b, vp);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  return {
    attach,
    camera,
    view,
    bounds,
    viewport,
    dragging,
    locked,
    relZoom,
    fitTo,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
