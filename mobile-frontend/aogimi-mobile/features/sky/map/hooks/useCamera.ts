import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import {
  DEFAULT_LIMITS,
  cameraFitting,
  clampCamera,
  easeOutCubic,
  fitZoom,
  focusLimits,
  matchAspect,
  panBy,
  tweenCamera,
  viewOf,
  zoomAround,
} from '../lib/camera';
import {
  CAMERA_TWEEN_MS,
  DRAG_SLOP_PX,
  ESCAPE_PUSH_DECAY_MS,
  ESCAPE_PUSH_PX,
  ZOOM_PER_WHEEL_PX,
} from '../lib/config';
import type { Bounds, Camera, Insets, Point, View, Viewport } from '../lib/types';

/**
 * The **native half** of the camera — the mirror of the web's `hooks/useCamera.ts`.
 *
 * Everything about *where the camera may be* is shared: `lib/camera.ts` is platform-free and is
 * copied between the two apps unchanged, so `clampCamera`, `zoomAround`, `cameraFitting` and the
 * zoom limits behave identically here. The pose state machine, the flight tween and the
 * escape-push accumulator are ported line-for-line from the web hook for the same reason — they are
 * the camera's *behaviour*, and a sky that leaves a deck differently on a phone would be a
 * different feature, not a different binding.
 *
 * What genuinely differs is only the platform seam, and it is three things:
 *
 *   web                                    native
 *   ─────────────────────────────────────  ─────────────────────────────────────────────────
 *   `attach` + ResizeObserver              `onLayout` — RN measures the view for us
 *   `localOf` + getBoundingClientRect      gesture coordinates arrive already view-local
 *   a non-passive `wheel` listener         `onPinch` / `onPan` / `onTap`, driven by the caller's
 *                                          gesture recogniser
 *
 * `requestAnimationFrame` and `performance.now()` both exist in React Native, so the flight code
 * needed no adaptation at all.
 *
 * **This hook owns no gesture recogniser.** It exposes the three verbs a recogniser calls
 * (`onPanStart/onPanMove/onPanEnd`, `onPinch`, plus `onLayout`), and the component wires them to
 * `react-native-gesture-handler`. That keeps the hook testable without a gesture tree, and it is
 * the same division the web has, where the canvas owns the pointer handlers.
 */

type Drag = {
  from: Point; // where it went down, in view px
  cam: Camera; // the pose at that moment; every move is measured from here, so no drift
  moved: boolean; // has it passed DRAG_SLOP_PX yet
};

/**
 * Either a definite pose, the intent to frame the whole of `bounds`, or one frame of a flight.
 * Verbatim from the web hook — see its comment for why "fit" stays an intent and why a flight pose
 * is deliberately unclamped.
 */
type Pose = Camera | 'fit' | { flight: Camera };

const isFlight = (p: Pose): p is { flight: Camera } => p !== 'fit' && 'flight' in p;

/** Stands in for one render, until `onLayout` reports the real size. Any positive size does — it
 *  only has to keep the camera maths from dividing by zero. */
const FALLBACK: Viewport = { width: 360, height: 480 };

/**
 * A pinch's scale converted to the same "how much wheel was spent" currency the escape-push
 * accumulator counts in, so `ESCAPE_PUSH_PX` keeps meaning what it means on the web.
 *
 * The web accumulates `|deltaY|` in CSS px. A pinch has no px delta, so a pinch-out step of scale
 * `f < 1` contributes the px a wheel would have needed to produce the same factor —
 * `|ln f| / ZOOM_PER_WHEEL_PX`, the exact inverse of the web's `Math.exp(-deltaY * …)`. That keeps
 * ESCAPE_PUSH_PX governing both platforms instead of a second native-only threshold that would have
 * to be re-tuned whenever the web's was.
 *
 * `ZOOM_PER_WHEEL_PX` is **imported**, not restated: it lives in the copied `lib/config.ts`, and a
 * local mirror of it here would be a fourth copy of a number whose whole job is to be one.
 */
const pushPxOf = (factor: number) => Math.abs(Math.log(factor)) / ZOOM_PER_WHEEL_PX;

export type CameraController = {
  /** Feed the view's measured size in. Wire to the `<Svg>`'s (or its parent's) `onLayout`. */
  onLayout: (e: LayoutChangeEvent) => void;
  camera: Camera;
  view: View;
  /** The world box the camera is actually confined to — the given bounds, grown to the viewport's
   *  aspect when `fillViewport` is on. What a boundary drawing must draw, or it lies. */
  bounds: Bounds;
  /** The measured view size the camera is working against. */
  viewport: Viewport;
  dragging: boolean;
  /** Whether the camera is currently immobile. The outer view is, by design. */
  locked: boolean;
  /** How far in the camera is relative to a fit of its current bounds — 1.0 at the fitted view. */
  relZoom: number;
  /** The largest `relZoom` this tier permits. */
  relZoomMax: number;
  fitTo: () => void;
  /** Fly to a pose over CAMERA_TWEEN_MS. Interruptible; `onArrive` fires only on a real landing. */
  flyTo: (target: Camera | 'fit', onArrive?: () => void) => void;
  /** Gesture verbs — see the class comment. Coordinates are view-local px. */
  onPanStart: (at: Point) => void;
  /** Returns true when the move belonged to a pan that actually moved the camera. */
  onPanMove: (at: Point) => boolean;
  /** Returns true when the press never became a drag, i.e. it should count as a tap. */
  onPanEnd: () => boolean;
  /** One pinch step: `factor` > 1 zooms in, < 1 out, about `at` (view-local px). */
  onPinch: (factor: number, at: Point) => void;
};

export type CameraOptions = {
  /** Immobile: no pan, no zoom, always fitted. The outer view is locked because it is a chooser. */
  locked?: boolean;
  /** Grow the world box to the viewport's aspect before any camera maths sees it, so the fitted
   *  view fills the container edge to edge. */
  fillViewport?: boolean;
  /** Called when a zoom-out is *pushed* while already fully pulled back — the moment the gesture
   *  should mean "leave". Not on the first step: the over-scroll accumulates past ESCAPE_PUSH_PX. */
  onZoomOutFloor?: () => void;
  /** How much of each viewport edge the host's overlays cover, in px. Compared by value. */
  insets?: Insets;
  /** Let both zoom limits adapt to the bounds (`focusLimits`) — the focused-deck tier turns this
   *  on so a few-card deck fills the view rather than floating in the middle of it. */
  adaptiveZoomLimits?: boolean;
};

export function useCamera(rawBounds: Bounds, opts: CameraOptions = {}): CameraController {
  const {
    locked = false,
    fillViewport = false,
    onZoomOutFloor,
    insets,
    adaptiveZoomLimits = false,
  } = opts;
  const [pose, setPose] = useState<Pose>('fit');
  const [viewport, setViewport] = useState<Viewport>(FALLBACK);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<Drag | null>(null);

  // Normalised to a value-stable object: hosts build `insets` fresh per render, and everything
  // below must key on the numbers, not the wrapper's identity.
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets ?? {};
  const ins = useMemo<Insets | undefined>(
    () => (top || right || bottom || left ? { top, right, bottom, left } : undefined),
    [top, right, bottom, left],
  );

  // resolved once here, so every path below is confined to the same box and none can disagree
  const bounds = useMemo(
    () => (fillViewport ? matchAspect(rawBounds, viewport, ins) : rawBounds),
    [rawBounds, viewport, fillViewport, ins],
  );

  const limits = useMemo(
    () => (adaptiveZoomLimits ? focusLimits(bounds, viewport, ins) : DEFAULT_LIMITS),
    [adaptiveZoomLimits, bounds, viewport, ins],
  );

  // bounds grow as the sky does and the viewport changes on rotation, but the gesture verbs are
  // stable. Reading these through refs keeps them so.
  const boundsRef = useRef(bounds);
  const viewportRef = useRef(viewport);
  const lockedRef = useRef(locked);
  const escapeRef = useRef(onZoomOutFloor);
  const insRef = useRef(ins);
  const limitsRef = useRef(limits);
  useEffect(() => {
    boundsRef.current = bounds;
    viewportRef.current = viewport;
    lockedRef.current = locked;
    escapeRef.current = onZoomOutFloor;
    insRef.current = ins;
    limitsRef.current = limits;
  });

  // A locked camera is the *intent* to be fitted, so it keeps re-resolving as the bounds change and
  // cannot be left stale by a gesture that raced it. A flight passes through the lock.
  const effective: Pose = isFlight(pose) ? pose : locked ? 'fit' : pose;

  // Clamped on the way *out*: entering a deck shrinks the box under a camera that was legal a
  // moment ago, and deriving the clamp here handles that without a correcting render. A flight
  // frame is the one exception — crossing the boundary is its whole point.
  const camera = useMemo(
    () =>
      isFlight(effective)
        ? effective.flight
        : clampCamera(
            effective === 'fit' ? cameraFitting(bounds, viewport, ins, limits) : effective,
            bounds,
            viewport,
            ins,
            limits,
          ),
    [effective, bounds, viewport, ins, limits],
  );

  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  });

  /* ---------- leaving the tier: the accumulated over-scroll ---------- */

  const pushRef = useRef({ px: 0, at: 0 });

  /* ---------- flights ---------- */

  const flightRef = useRef<{ raf: number; onArrive?: () => void } | null>(null);

  /** End any flight. An interrupted one lands where it is, clamped back inside the law — or back on
   *  the fit intent when locked, where a free pose means nothing. */
  const stopFlight = useCallback((arrived: boolean) => {
    const flight = flightRef.current;
    if (!flight) return;
    cancelAnimationFrame(flight.raf);
    flightRef.current = null;
    if (arrived) flight.onArrive?.();
    else {
      setPose(
        lockedRef.current
          ? 'fit'
          : clampCamera(
              cameraRef.current,
              boundsRef.current,
              viewportRef.current,
              insRef.current,
              limitsRef.current,
            ),
      );
    }
  }, []);

  // a flight left running past unmount would keep calling setPose into nothing
  useEffect(
    () => () => {
      if (flightRef.current) cancelAnimationFrame(flightRef.current.raf);
    },
    [],
  );

  const flyTo = useCallback(
    (target: Camera | 'fit', onArrive?: () => void) => {
      stopFlight(false);
      const from = cameraRef.current;
      const start = performance.now();
      const flight: { raf: number; onArrive?: () => void } = { raf: 0, onArrive };
      flightRef.current = flight;
      setPose({ flight: from });

      const step = (now: number) => {
        if (flightRef.current !== flight) return; // a newer flight or a gesture took over
        const b = boundsRef.current;
        const vp = viewportRef.current;
        const iv = insRef.current;
        // 'fit' resolves per frame, so a flight racing a bounds change still lands on the new fit
        const to = target === 'fit' ? cameraFitting(b, vp, iv, limitsRef.current) : target;
        const k = Math.min(1, (now - start) / CAMERA_TWEEN_MS);
        if (k >= 1) {
          setPose(target === 'fit' ? 'fit' : clampCamera(target, b, vp, iv, limitsRef.current));
          stopFlight(true);
          return;
        }
        setPose({ flight: tweenCamera(from, to, easeOutCubic(k)) });
        flight.raf = requestAnimationFrame(step);
      };
      flight.raf = requestAnimationFrame(step);
    },
    [stopFlight],
  );

  // An insets change is the host's chrome moving, and the camera answers by re-fitting as a flight.
  // Skipped on mount and while a flight is already running — a running 'fit' target re-resolves
  // against the new insets every frame anyway.
  //
  // An effect rather than a layout effect: RN has no pre-paint commit hook with the same meaning as
  // the web's useLayoutEffect-before-paint, and the departure pose is committed synchronously by
  // `flyTo` either way.
  const prevInsRef = useRef(ins);
  useEffect(() => {
    if (prevInsRef.current === ins) return;
    prevInsRef.current = ins;
    if (flightRef.current) return;
    // A legitimate sync-from-external-trigger, guarded to fire once per change. The web copy needs an
    // `eslint-disable react-hooks/set-state-in-effect` here; that rule is not in this project's
    // config, so adding the directive would itself be an error ("definition for rule not found").
    flyTo('fit');
  }, [ins, flyTo]);

  const view = useMemo(() => viewOf(camera, viewport), [camera, viewport]);
  const fit = useMemo(() => fitZoom(bounds, viewport, ins, limits), [bounds, viewport, ins, limits]);
  const relZoom = camera.zoom / fit;
  const relZoomMax = limits.max / fit;

  const fitTo = useCallback(() => setPose('fit'), []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // a zero measurement is ignored rather than propagated, since it would divide through the maths
    if (width > 0 && height > 0) {
      setViewport((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    }
  }, []);

  /* ---------- the gesture verbs ---------- */

  const onPanStart = useCallback(
    (at: Point) => {
      stopFlight(false); // a press takes the camera back from a flight
      dragRef.current = { from: at, cam: cameraRef.current, moved: false };
      setDragging(true);
    },
    [stopFlight],
  );

  const onPanMove = useCallback((at: Point) => {
    const drag = dragRef.current;
    if (!drag) return false;

    const dx = at.x - drag.from.x;
    const dy = at.y - drag.from.y;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_SLOP_PX) drag.moved = true;
    // A locked camera still tracks the press — it has to, or the slop test could never fail and a
    // sloppy tap at the outer view would be read as a drag. It simply does not move.
    if (drag.moved && !lockedRef.current) {
      setPose(
        clampCamera(
          panBy(drag.cam, dx, dy),
          boundsRef.current,
          viewportRef.current,
          insRef.current,
          limitsRef.current,
        ),
      );
    }
    return true;
  }, []);

  const onPanEnd = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    return !!drag && !drag.moved;
  }, []);

  /**
   * One pinch step. The web's wheel handler, with the delta→factor conversion removed because a
   * pinch already *is* a factor — which is exactly the seam the web hook predicted ("it reaches the
   * shared maths as a plain multiplier, which is what lets a pinch gesture drive the identical code
   * path").
   */
  const onPinch = useCallback(
    (factor: number, at: Point) => {
      if (factor <= 0 || factor === 1) return;
      // The pinch takes over from a flight — except at the locked outer view, where it is otherwise
      // inert and a momentum tail arriving mid-return-flight must not cut it short.
      if (flightRef.current) {
        if (lockedRef.current) return;
        stopFlight(false);
      }
      const b = boundsRef.current;
      const vp = viewportRef.current;
      const iv = insRef.current;

      if (factor < 1) {
        const lim = limitsRef.current;
        const floor = fitZoom(b, vp, iv, lim);
        if (cameraRef.current.zoom <= floor + 1e-9) {
          // At the wall. Accumulate the shove instead of leaving on the first step, so a pinch that
          // merely lands back on the fitted view spends its tail here and goes no further.
          const push = pushRef.current;
          const now = performance.now();
          if (now - push.at > ESCAPE_PUSH_DECAY_MS) push.px = 0;
          push.at = now;
          push.px += pushPxOf(factor);
          if (push.px >= ESCAPE_PUSH_PX) {
            push.px = 0;
            escapeRef.current?.();
          }
          return;
        }
        // still room to pull back, so this is zooming, not pushing at the wall
        pushRef.current.px = 0;
        setPose((current) => {
          const from =
            current === 'fit'
              ? cameraFitting(b, vp, iv, lim)
              : isFlight(current)
                ? current.flight
                : current;
          return clampCamera(zoomAround(from, at, factor, b, vp, iv, lim), b, vp, iv, lim);
        });
        return;
      }

      // any zoom-in abandons whatever was being pushed against the floor
      pushRef.current.px = 0;
      if (lockedRef.current) return; // the outer view has nothing to zoom into but a deck
      setPose((current) => {
        const lim = limitsRef.current;
        const from =
          current === 'fit'
            ? cameraFitting(b, vp, iv, lim)
            : isFlight(current)
              ? current.flight
              : current;
        return clampCamera(zoomAround(from, at, factor, b, vp, iv, lim), b, vp, iv, lim);
      });
    },
    [stopFlight],
  );

  return {
    onLayout,
    camera,
    view,
    bounds,
    viewport,
    dragging,
    locked,
    relZoom,
    relZoomMax,
    fitTo,
    flyTo,
    onPanStart,
    onPanMove,
    onPanEnd,
    onPinch,
  };
}
