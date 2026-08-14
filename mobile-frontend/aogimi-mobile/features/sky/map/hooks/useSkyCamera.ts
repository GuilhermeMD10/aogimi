import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  // runOnJS is deprecated in reanimated v4 (the replacement is the auto-bridge
  // from worklet -> JS), but still works and states the thread hop at the call
  // site, which is worth keeping in a file that lives on both threads.
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  DEFAULT_LIMITS,
  cameraFitting,
  clampCamera,
  fitZoom,
  focusLimits,
  matchAspect,
  viewOf,
  type ZoomLimits,
} from '../lib/camera';
import {
  CAMERA_TWEEN_MS,
  DRAG_SLOP_PX,
  ESCAPE_PUSH_DECAY_MS,
  ESCAPE_PUSH_PX,
  ZOOM_PER_WHEEL_PX,
} from '../lib/config';
import type { Bounds, Camera, Insets, Point, View, Viewport } from '../lib/types';
import {
  clampCameraW,
  fitZoomW,
  panRangeW,
  zoomAroundW,
} from '../native/cameraWorklet';
import {
  COMMIT_ZOOM_RATIO,
  DOUBLE_TAP_ZOOM,
  ZOOM_GIVE,
  ZOOM_GIVE_MAX,
  FLING_DECELERATION,
  FLING_MIN_VELOCITY,
  RUBBER_BAND,
  RUBBER_BAND_MAX,
  RUBBER_SPRING,
} from '../native/gestureConfig';

/**
 * The sky's camera, with the **live pose on the UI thread**.
 *
 * This is the file that makes the native sky smooth, and the whole idea is one sentence: a gesture
 * writes three shared values and nothing else happens. No `setState`, no reconcile, no Fabric commit
 * — the Skia renderer reads those three values straight into a matrix, so a pan or a pinch is a GPU
 * transform of a picture that was already built.
 *
 * It replaces `useCamera.ts`, which held the pose in React state and forced every gesture through
 * `runOnJS` (see that file's header). That was the right shape for an SVG tree whose every node had
 * to be re-rendered anyway; it is the wrong shape for a canvas.
 *
 * ── Two poses, and the difference is the design ──────────────────────────────────────────────────
 *
 *   **live** — `camX` / `camY` / `camZoom`, shared values. The truth during a gesture. Clamped every
 *   frame by `native/cameraWorklet.ts`, the verified mirror of `lib/camera.ts`'s clamp law.
 *
 *   **committed** — `camera`, React state. What the *level of detail* is resolved against: which
 *   stars exist, which layer is up, how large a star is in world units, what the culling box is.
 *
 * Pan never commits — the picture is world-space, so panning cannot change what should be drawn, only
 * where it lands on screen. Zoom commits when the live zoom has drifted past `COMMIT_ZOOM_RATIO`, and
 * every gesture commits when it ends. So a pinch pays a dozen React renders instead of sixty, and a
 * pan pays none.
 *
 * The cost of that trade, stated plainly: **between commits the picture is scaled by the matrix**, so
 * mid-pinch a star's radius and a strand's width drift with the zoom instead of holding their screen
 * size, snapping back at each commit. It is the same behaviour a map has while a pinch is in flight,
 * and it is invisible during a pan (no scale change at all). Closing that gap means rebuilding the
 * star layer on the UI thread; the commit ratio is the knob that decides how visible it is until then.
 *
 * ── What stays on the JS thread, on purpose ──────────────────────────────────────────────────────
 * Everything about where the camera comes to **rest**: `cameraFitting`, `focusLimits`, `matchAspect`,
 * and the flight targets. Those call the real `lib/camera.ts`. Only the clamp is mirrored, because
 * only the clamp has to run inside a gesture. See `native/cameraWorklet.ts` for why it cannot simply
 * be imported into a worklet, and `npm run verify:camera` for what keeps the two honest.
 *
 * ── Two tiers, and only one of them moves ────────────────────────────────────────────────────────
 * **All decks: locked.** No pan, no zoom, always fitted. It is a chooser — every deck is on screen at
 * once by construction, so there is nothing a drag could reach. The gestures still *track* (the pan
 * counts its travel so the slop test can fail and the host's tap can win) but move nothing.
 *
 * **Inside a deck: free**, within that deck's own box. `adaptiveZoomLimits` makes the fitted view frame
 * exactly its stars, and pinching out past that fit is how you leave: the zoom **gives**, damped and
 * capped (`ZOOM_GIVE`), and the shove accumulates until it clears `ESCAPE_PUSH_PX`. So the boundary
 * answers your fingers and resists them, and leaving takes intent rather than one step over a line.
 */

/** The clamp law as flat numbers, which is all a worklet can be handed. Rebuilt on the JS thread
 *  whenever the tier, the measured viewport or the host's chrome changes. */
type CameraLaw = {
  bounds: Bounds;
  viewport: Viewport;
  /** null rather than undefined: a worklet's `?? undefined` seam is one more thing to get wrong, and
   *  the mirror's signature takes null. */
  ins: Insets | null;
  limFit: number;
  limMax: number;
};

export type SkyCameraController = {
  /** Wire to the canvas host's `onLayout`. The camera cannot resolve anything until it has a size. */
  onLayout: (e: LayoutChangeEvent) => void;

  /** The live pose. What the renderer's transform reads; what a gesture writes. */
  camX: SharedValue<number>;
  camY: SharedValue<number>;
  camZoom: SharedValue<number>;

  /** The committed pose — what LOD, culling and star sizing are resolved against. */
  camera: Camera;
  /** The committed pose as a world rectangle. */
  view: View;
  /** The box the camera is confined to: the given bounds, grown to the viewport's aspect when
   *  `fillViewport` is on. What a boundary drawing must draw, or it lies. */
  bounds: Bounds;
  viewport: Viewport;
  /** How far in the committed camera is relative to a fit of its bounds — 1.0 at the fitted view. */
  relZoom: number;
  relZoomMax: number;

  fitTo: () => void;
  /** Fly to a pose over CAMERA_TWEEN_MS. Interruptible by any gesture; `onArrive` fires only on a
   *  real landing. */
  flyTo: (target: Camera | 'fit', onArrive?: () => void) => void;

  /** Pan + pinch + double-tap, entirely on the UI thread. The host composes its own tap and
   *  long-press with this — those need picking, which lives on the JS thread. */
  panZoomGesture: ReturnType<typeof Gesture.Race>;

  /** Viewport px → world under the **live** pose. For hit-testing a tap, which must resolve against
   *  where the sky is right now, not where it was at the last commit. */
  toWorldLive: (at: Point) => Point;
  /** World units per screen px under the live pose — for chrome that has to track the sky. */
  liveWorldPerPx: SharedValue<number>;
  /** False until `onLayout` reports a real size. The host must not draw the world before this. */
  measured: boolean;
};

export type SkyCameraOptions = {
  /**
   * Immobile: no pan, no zoom, always fitted. **The all-decks tier is locked** — it is a chooser,
   * every deck is on screen at once by construction, and there is nothing a drag could reach. Only a
   * focused deck is navigable.
   */
  locked?: boolean;
  /** Grow the world box to the viewport's aspect before any camera maths sees it, so the fitted view
   *  fills the container edge to edge instead of letterboxing a smaller rectangle inside it. */
  fillViewport?: boolean;
  /** Called when a zoom-out is *pushed* while already fully pulled back — the moment the gesture
   *  means "leave this tier". Not on the first step: the over-scroll accumulates past
   *  ESCAPE_PUSH_PX, so a pinch that merely lands back on the fitted view spends its tail there. */
  onZoomOutFloor?: () => void;
  /** How much of each viewport edge the host's overlays cover, in px. Compared by value. */
  insets?: Insets;
  /** Let both zoom limits adapt to the bounds (`focusLimits`) — the focused-deck tier turns this on
   *  so a few-card deck fills the view rather than floating in the middle of it. */
  adaptiveZoomLimits?: boolean;
};

/** Stands in for one render, until `onLayout` reports the real size. Any positive size does — it only
 *  has to keep the camera maths from dividing by zero. */
const FALLBACK: Viewport = { width: 360, height: 480 };

/** A pinch step converted to the "how much wheel was spent" currency `ESCAPE_PUSH_PX` counts in, so
 *  one constant governs both platforms. The exact inverse of the web's `exp(-deltaY * k)`. */
const pushPxOf = (factor: number) => {
  'worklet';
  return Math.abs(Math.log(factor)) / ZOOM_PER_WHEEL_PX;
};

export function useSkyCamera(rawBounds: Bounds, opts: SkyCameraOptions = {}): SkyCameraController {
  const {
    locked = false,
    fillViewport = false,
    onZoomOutFloor,
    insets,
    adaptiveZoomLimits = false,
  } = opts;

  const [viewport, setViewport] = useState<Viewport>(FALLBACK);
  /** Whether `onLayout` has reported a real size yet. The canvas does not draw until it has — one frame
   *  drawn against `FALLBACK` is a frame of the sky at the wrong scale, which is a flicker of its own. */
  const [measured, setMeasured] = useState(false);
  /** The committed pose, or the *intent* to frame the whole box. 'fit' stays an intent so it keeps
   *  re-resolving as the bounds change and cannot be left stale by a gesture that raced it. */
  const [pose, setPose] = useState<Camera | 'fit'>('fit');

  // Normalised to a value-stable object: hosts build `insets` fresh per render, and everything below
  // must key on the numbers rather than the wrapper's identity.
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets ?? {};
  const ins = useMemo<Insets | null>(
    () => (top || right || bottom || left ? { top, right, bottom, left } : null),
    [top, right, bottom, left],
  );

  // Resolved once here, so every path below is confined to the same box and none can disagree.
  const bounds = useMemo(
    () => (fillViewport ? matchAspect(rawBounds, viewport, ins ?? undefined) : rawBounds),
    [rawBounds, viewport, fillViewport, ins],
  );

  const limits = useMemo<ZoomLimits>(
    () => (adaptiveZoomLimits ? focusLimits(bounds, viewport, ins ?? undefined) : DEFAULT_LIMITS),
    [adaptiveZoomLimits, bounds, viewport, ins],
  );

  /**
   * The committed pose. **Deliberately not clamped** — and that is a fix, not an omission.
   *
   * Clamping here was the flicker. Entering a deck shrinks the world box, and the new box's fit is a
   * *higher* zoom than the whole sky's, so a clamp instantly raised the committed zoom to that floor
   * while the live pose was still outside, mid-flight. The picture is built from the committed camera
   * (star radii, LOD, culling) and positioned by the live one, so for one frame the stars were sized
   * for a view the transform had not reached — which is exactly the "stars jump to a position close
   * to the previous one" flicker.
   *
   * Nothing needs the clamp: every gesture path clamps on the UI thread through the verified mirror,
   * `flyTo` clamps its target, and `'fit'` resolves to a legal pose by construction. So the only thing
   * a clamp here could catch is a bounds change under a legal pose — the one case where the committed
   * and live poses must be left alone to travel together.
   */
  const camera = useMemo<Camera>(
    () => (pose === 'fit' ? cameraFitting(bounds, viewport, ins ?? undefined, limits) : pose),
    [pose, bounds, viewport, ins, limits],
  );

  const view = useMemo(() => viewOf(camera, viewport), [camera, viewport]);
  const fit = useMemo(
    () => fitZoom(bounds, viewport, ins ?? undefined, limits),
    [bounds, viewport, ins, limits],
  );

  /* ---------- the live pose, and the law it answers to ---------- */

  const camX = useSharedValue(camera.x);
  const camY = useSharedValue(camera.y);
  const camZoom = useSharedValue(camera.zoom);

  /** The clamp law, as one shared value so a worklet reads it in a single access. */
  const law = useSharedValue<CameraLaw>({
    bounds,
    viewport,
    ins,
    limFit: limits.fit,
    limMax: limits.max,
  });
  useEffect(() => {
    law.value = { bounds, viewport, ins, limFit: limits.fit, limMax: limits.max };
  }, [law, bounds, viewport, ins, limits]);

  /**
   * Whether the UI thread currently owns the camera — a gesture, a fling, a spring-back or a flight.
   * While it does, the React→live push below stands off: the committed pose is a *consequence* of the
   * live one during a gesture, and pushing it back would fight the finger.
   */
  const driving = useSharedValue(false);
  /** Read inside the gesture worklets rather than baked into the tree: the tier changes, and a gesture
   *  tree rebuilt mid-drag drops the drag. */
  const lockedSV = useSharedValue(locked);
  useEffect(() => {
    lockedSV.value = locked;
  }, [lockedSV, locked]);
  /** The live zoom at the last commit, so the ratio test has something to measure against. */
  const committedZoom = useSharedValue(camera.zoom);

  const liveWorldPerPx = useDerivedValue(() => 1 / camZoom.value);

  /* ---------- committing the live pose back to React ---------- */

  const commit = useCallback((x: number, y: number, zoom: number) => {
    // Straight to state: `camera` re-clamps on the way out, so this does not need to.
    setPose({ x, y, zoom });
  }, []);

  /** Called from worklets at the moments the LOD has to catch up. */
  const commitNow = useCallback(
    (x: number, y: number, zoom: number) => {
      commit(x, y, zoom);
    },
    [commit],
  );

  // The zoom-drift commit. Pan is deliberately absent: the picture is world space, so panning cannot
  // change what should be drawn — only the culling box, and `useSkyDraw` already carries a hysteresis
  // band wide enough to absorb a pan between commits.
  useAnimatedReaction(
    () => camZoom.value,
    (z) => {
      if (!driving.value) return;
      const ratio = z / committedZoom.value;
      if (ratio > COMMIT_ZOOM_RATIO || ratio < 1 / COMMIT_ZOOM_RATIO) {
        committedZoom.value = z;
        runOnJS(commitNow)(camX.value, camY.value, z);
      }
    },
    [commitNow],
  );

  /**
   * React → live, and the **other half of the flicker fix**.
   *
   * The naive version assigned the committed pose straight into the shared values whenever it changed.
   * That produced a visible two-step on every tier change: the live pose *jumped* to the new fit, and
   * only then did the host's `flyTo` animate from there — "the stars flicker from a position to one
   * close to the previous". Same on mount, where the first render measures the fallback viewport and
   * the real `onLayout` arrives a frame later.
   *
   * So it now distinguishes three cases:
   *
   *   **first real measurement** — snap. There is nothing on screen yet to flicker (the canvas does not
   *   draw until `measured`), and this is what puts the camera at its opening fit.
   *
   *   **the world moved** — a tier change, the host's chrome resizing, new zoom limits. Do **nothing**.
   *   The live pose stays exactly where it is and a flight owns the transition, which is the only way
   *   the two poses travel together instead of one jumping ahead of the other.
   *
   *   **the pose itself was set** — `fitTo()`, i.e. a deliberate recenter. Fly, don't jump.
   */
  const syncedOnce = useRef(false);
  const prevWorld = useRef({ bounds, ins, limits });
  useEffect(() => {
    const worldMoved =
      prevWorld.current.bounds !== bounds ||
      prevWorld.current.ins !== ins ||
      prevWorld.current.limits !== limits;
    prevWorld.current = { bounds, ins, limits };

    if (driving.value) return;

    if (!syncedOnce.current) {
      if (!measured) return; // still on FALLBACK; snapping now would frame the wrong box
      syncedOnce.current = true;
      camX.value = camera.x;
      camY.value = camera.y;
      camZoom.value = camera.zoom;
      committedZoom.value = camera.zoom;
      return;
    }

    if (worldMoved) return; // a flight will bring the live pose across
    if (camX.value === camera.x && camY.value === camera.y && camZoom.value === camera.zoom) return;
    flyToRef.current?.(camera);
  }, [camera, measured, bounds, ins, limits, camX, camY, camZoom, committedZoom, driving]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    // A zero measurement is ignored rather than propagated, since it would divide through the maths.
    if (width > 0 && height > 0) {
      setViewport((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      setMeasured(true);
    }
  }, []);

  /* ---------- flights ---------- */

  /**
   * A flight is a tween of the live values, driven by one progress shared value. Zoom interpolates in
   * **log space** — zoom is a ratio, so equal steps of progress should multiply it by equal factors;
   * interpolated linearly a flight into a deck spends almost every frame nearly arrived and then
   * lurches through the last doubling. That is `lib/camera.ts`'s `tweenCamera`, restated as the
   * reaction below rather than imported, for the same reason the clamp is.
   *
   * The target is resolved on the **JS thread** at call time, against the real lib. A `'fit'` flight
   * therefore lands on the fit as it was when the flight started; the arrival clamp catches a bounds
   * change that raced it, which is the one behaviour the old hook's per-frame re-resolve bought and
   * this does not.
   */
  /**
   * **Who owns the camera right now.** A flight sets it; any gesture *starting* clears it, so a finger
   * can always interrupt a flight in progress.
   *
   * This is the fix for the two-frame teleport out of a deck. Leaving is triggered by the pinch itself
   * (the escape push), so the pinch's own `onEnd` arrived immediately after `flyTo` had started — and
   * `settle()` then sprang the camera to `clampCamera(livePose, wholeSkyBounds)` with `RUBBER_SPRING`,
   * a fast critically-damped spring, straight over the top of the flight's tween. Two animations
   * writing the same three values, one of them very fast: the zoom-out collapsed into a jump.
   *
   * So `settle()` and the fling now stand down while a flight owns the camera, and the flight's own
   * completion stands down if a gesture has taken it back.
   */
  const flightActive = useSharedValue(false);
  const flightT = useSharedValue(1);
  const flightFrom = useSharedValue<Camera>(camera);
  const flightTo = useSharedValue<Camera>(camera);

  useAnimatedReaction(
    () => flightT.value,
    (t) => {
      if (t >= 1 || !flightActive.value) return;
      const a = flightFrom.value;
      const b = flightTo.value;
      camX.value = a.x + (b.x - a.x) * t;
      camY.value = a.y + (b.y - a.y) * t;
      camZoom.value = Math.exp(Math.log(a.zoom) * (1 - t) + Math.log(b.zoom) * t);
    },
  );

  /** `flyTo` is declared below the sync effect that needs it, so it arrives through a ref. */
  const flyToRef = useRef<((t: Camera | 'fit') => void) | null>(null);
  const arriveRef = useRef<(() => void) | undefined>(undefined);
  const onFlightEnd = useCallback(
    (finished: boolean, x: number, y: number, zoom: number) => {
      commit(x, y, zoom);
      if (finished) arriveRef.current?.();
      arriveRef.current = undefined;
    },
    [commit],
  );

  const flyTo = useCallback(
    (target: Camera | 'fit', onArrive?: () => void) => {
      const to =
        target === 'fit'
          ? cameraFitting(bounds, viewport, ins ?? undefined, limits)
          : clampCamera(target, bounds, viewport, ins ?? undefined, limits);
      arriveRef.current = onArrive;
      flightFrom.value = { x: camX.value, y: camY.value, zoom: camZoom.value };
      flightTo.value = to;
      driving.value = true;
      flightActive.value = true;
      flightT.value = 0;
      flightT.value = withTiming(
        1,
        { duration: CAMERA_TWEEN_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          // A gesture took the camera back mid-flight; it owns the landing now.
          if (!flightActive.value) return;
          flightActive.value = false;
          // Land exactly on the target rather than on the last tween frame, so a flight's arrival is
          // the pose that was asked for and not a rounding of it.
          if (finished) {
            camX.value = to.x;
            camY.value = to.y;
            camZoom.value = to.zoom;
          }
          driving.value = false;
          committedZoom.value = camZoom.value;
          runOnJS(onFlightEnd)(!!finished, camX.value, camY.value, camZoom.value);
        },
      );
    },
    [
      bounds, viewport, ins, limits,
      camX, camY, camZoom, committedZoom, driving, flightActive, flightT, flightFrom, flightTo,
      onFlightEnd,
    ],
  );

  useEffect(() => {
    flyToRef.current = flyTo;
  }, [flyTo]);

  const fitTo = useCallback(() => {
    // The intent, not a pose — so it re-resolves if the bounds move under it.
    driving.value = false;
    setPose('fit');
  }, [driving]);

  /* ---------- the gesture tree ---------- */

  /**
   * Built once. Every dependency is either a shared value (stable identity, current contents) or a
   * ref, which is what lets the tree be created a single time instead of per render — a gesture
   * rebuilt mid-drag drops the drag.
   */
  const escapeRef = useRef(onZoomOutFloor);
  useEffect(() => {
    escapeRef.current = onZoomOutFloor;
  });
  const escape = useCallback(() => escapeRef.current?.(), []);

  const panZoomGesture = useMemo(() => {
    /**
     * Pan state, and the shape of it is **the pinch fix**.
     *
     * It used to hold the pose at press and rebuild the camera as `start − totalTranslation`, with the
     * pinch writing `start` back on every step to keep the two in sync. That double-counted: the pan
     * then re-applied its whole accumulated translation from the pose the pinch had *already* moved, so
     * a two-finger gesture dragged the sky by its own history and the zoom appeared pinned to whichever
     * finger landed first instead of to the point between them.
     *
     * Now the pan applies **incremental** deltas to the live pose. Pan and pinch compose by construction
     * — each simply moves the camera a little — and neither needs to know the other exists.
     *
     * `n` is the pointer count. When a second finger lands (or lifts) the pan's translation jumps,
     * because it tracks the centroid of everything down; that frame resyncs instead of moving, which is
     * what stops the sky lurching as the pinch begins.
     */
    const pan_ = { tx: 0, ty: 0, n: 0, travel: 0, moved: false };
    /** Pinch's `scale` is cumulative across the gesture, so each step is the ratio against the
     *  previous one — the plain multiplier the shared maths wants. */
    const pinchState = { last: 1 };
    /** The escape-push accumulator, in wheel px. */
    const push = { px: 0, at: 0 };

    /** Spring whichever axis is out of bounds back to the edge, and commit. */
    const settle = () => {
      'worklet';
      // A flight owns the camera — most importantly the one the escape push just started, whose
      // trigger was this very gesture. Springing here would race it and collapse the zoom-out.
      if (flightActive.value) return;
      const l = law.value;
      const legal = clampCameraW(
        { x: camX.value, y: camY.value, zoom: camZoom.value },
        l.bounds, l.viewport, l.ins, l.limFit, l.limMax,
      );
      const needsX = legal.x !== camX.value;
      const needsY = legal.y !== camY.value;
      const needsZ = legal.zoom !== camZoom.value;
      if (!needsX && !needsY && !needsZ) {
        driving.value = false;
        committedZoom.value = camZoom.value;
        runOnJS(commitNow)(camX.value, camY.value, camZoom.value);
        return;
      }
      if (needsZ) camZoom.value = withSpring(legal.zoom, RUBBER_SPRING);
      if (needsY) camY.value = withSpring(legal.y, RUBBER_SPRING);
      camX.value = needsX
        ? withSpring(legal.x, RUBBER_SPRING, () => {
            'worklet';
            driving.value = false;
            committedZoom.value = camZoom.value;
            runOnJS(commitNow)(camX.value, camY.value, camZoom.value);
          })
        : camX.value;
      if (!needsX) {
        // No x spring to hang the callback on, so commit against the settled pose directly.
        driving.value = false;
        committedZoom.value = legal.zoom;
        runOnJS(commitNow)(legal.x, legal.y, legal.zoom);
      }
    };

    /**
     * Apply a raw (unclamped) centre, letting it travel a damped fraction past the edge. This is the
     * rubber band: the legal pose from the verified mirror, plus a bounded share of the excess.
     */
    const rubber = (rawX: number, rawY: number) => {
      'worklet';
      const l = law.value;
      const r = panRangeW(camZoom.value, l.bounds, l.viewport, l.ins);
      const maxX = (l.viewport.width * RUBBER_BAND_MAX) / camZoom.value;
      const maxY = (l.viewport.height * RUBBER_BAND_MAX) / camZoom.value;

      const overX = rawX < r.xLo ? rawX - r.xLo : rawX > r.xHi ? rawX - r.xHi : 0;
      const overY = rawY < r.yLo ? rawY - r.yLo : rawY > r.yHi ? rawY - r.yHi : 0;

      camX.value =
        overX === 0
          ? rawX
          : (rawX - overX) + Math.sign(overX) * Math.min(Math.abs(overX) * RUBBER_BAND, maxX);
      camY.value =
        overY === 0
          ? rawY
          : (rawY - overY) + Math.sign(overY) * Math.min(Math.abs(overY) * RUBBER_BAND, maxY);
    };

    const pan = Gesture.Pan()
      // Below the slop the recogniser does not activate at all, which is what lets the host's Tap win
      // the Race on a sloppy finger instead of the pan swallowing it.
      .minDistance(DRAG_SLOP_PX)
      .onStart((e) => {
        'worklet';
        flightActive.value = false; // a finger down interrupts any flight
        driving.value = true;
        pan_.tx = e.translationX;
        pan_.ty = e.translationY;
        pan_.n = e.numberOfPointers;
        pan_.travel = 0;
        pan_.moved = false;
      })
      .onUpdate((e) => {
        'worklet';
        // A finger arrived or left: the centroid moved without the hand moving. Resync, don't pan.
        if (e.numberOfPointers !== pan_.n) {
          pan_.n = e.numberOfPointers;
          pan_.tx = e.translationX;
          pan_.ty = e.translationY;
          return;
        }
        const dx = e.translationX - pan_.tx;
        const dy = e.translationY - pan_.ty;
        pan_.tx = e.translationX;
        pan_.ty = e.translationY;
        pan_.travel += Math.hypot(dx, dy);
        if (pan_.travel > DRAG_SLOP_PX) pan_.moved = true;
        if (lockedSV.value) return; // the chooser tracks the press but does not move
        // Incremental, against the *live* zoom — so a pinch running alongside simply changes the scale
        // the next delta is divided by, rather than invalidating an anchor.
        rubber(camX.value - dx / camZoom.value, camY.value - dy / camZoom.value);
      })
      .onEnd((e) => {
        'worklet';
        if (lockedSV.value) {
          driving.value = false;
          return;
        }
        if (flightActive.value) return; // a flight is carrying the camera; do not coast over it
        const l = law.value;
        const speed = Math.hypot(e.velocityX, e.velocityY);
        const r = panRangeW(camZoom.value, l.bounds, l.viewport, l.ins);
        const out =
          camX.value < r.xLo || camX.value > r.xHi || camY.value < r.yLo || camY.value > r.yHi;

        // Overscrolled, or too slow to be a flick: spring/settle rather than coast.
        if (out || speed < FLING_MIN_VELOCITY) {
          settle();
          return;
        }

        // A fling. The zoom cannot change while it runs, so the legal range is fixed and `withDecay`
        // can own the clamp — which is what keeps the coast entirely inside Reanimated.
        camY.value = withDecay({
          velocity: -e.velocityY / camZoom.value,
          deceleration: FLING_DECELERATION,
          clamp: [r.yLo, r.yHi],
          rubberBandEffect: true,
        });
        camX.value = withDecay(
          {
            velocity: -e.velocityX / camZoom.value,
            deceleration: FLING_DECELERATION,
            clamp: [r.xLo, r.xHi],
            rubberBandEffect: true,
          },
          () => {
            'worklet';
            driving.value = false;
            committedZoom.value = camZoom.value;
            runOnJS(commitNow)(camX.value, camY.value, camZoom.value);
          },
        );
      })
      .onFinalize(() => {
        'worklet';
        // A cancelled gesture (a system pan-out, a second finger arriving badly) never reaches onEnd,
        // and leaving `driving` set would strand the camera out of React's reach.
        if (driving.value && !flightActive.value) settle();
      });

    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        if (lockedSV.value) return;
        flightActive.value = false; // a finger down interrupts any flight
        driving.value = true;
        pinchState.last = 1;
      })
      .onUpdate((e) => {
        'worklet';
        if (lockedSV.value) return;
        if (e.scale <= 0) return;
        const step = e.scale / pinchState.last;
        pinchState.last = e.scale;
        if (step === 1) return;

        const l = law.value;
        const at = { x: e.focalX, y: e.focalY };

        if (step < 1) {
          const floor = fitZoomW(l.bounds, l.viewport, l.ins, l.limFit);
          const raw = camZoom.value * step;
          if (raw < floor) {
            /**
             * Past the fitted view. Two things happen at once, and both are the point:
             *
             * The zoom **gives** — damped, capped, springing back on release (`settle`). A hard wall
             * here just stops answering the fingers, which reads as a dropped gesture; a give says
             * "there is an edge, and you are pushing on it".
             *
             * And the shove **accumulates**. Leaving a deck is deliberate, so it takes a push past
             * ESCAPE_PUSH_PX rather than the first step over the line — a pinch that merely lands back
             * on the fitted view spends its tail here and goes no further.
             */
            const excess = floor / Math.max(raw, 1e-9);
            camZoom.value = Math.max(floor / (1 + (excess - 1) * ZOOM_GIVE), floor / ZOOM_GIVE_MAX);

            const now = Date.now();
            if (now - push.at > ESCAPE_PUSH_DECAY_MS) push.px = 0;
            push.at = now;
            push.px += pushPxOf(step);
            if (push.px >= ESCAPE_PUSH_PX) {
              push.px = 0;
              runOnJS(escape)();
            }
            return;
          }
          push.px = 0;
        } else {
          push.px = 0;
        }

        const next = zoomAroundW(
          { x: camX.value, y: camY.value, zoom: camZoom.value },
          at, step,
          l.bounds, l.viewport, l.ins, l.limFit, l.limMax,
        );
        camX.value = next.x;
        camY.value = next.y;
        camZoom.value = next.zoom;
        // Nothing to write back to the pan: it works in deltas against the live pose, so it has
        // already absorbed this. Syncing an anchor here is what caused the first-finger bug.
      })
      .onEnd(() => {
        'worklet';
        if (lockedSV.value) return;
        settle();
      });

    /** A double tap zooms in about the tapped point — the one way to reach a star without a pinch. */
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(260)
      .onEnd((e, success) => {
        'worklet';
        if (!success || lockedSV.value) return;
        const l = law.value;
        driving.value = true;
        flightActive.value = true;
        const next = zoomAroundW(
          { x: camX.value, y: camY.value, zoom: camZoom.value },
          { x: e.x, y: e.y }, DOUBLE_TAP_ZOOM,
          l.bounds, l.viewport, l.ins, l.limFit, l.limMax,
        );
        flightFrom.value = { x: camX.value, y: camY.value, zoom: camZoom.value };
        flightTo.value = next;
        flightT.value = 0;
        flightT.value = withTiming(
          1,
          { duration: CAMERA_TWEEN_MS, easing: Easing.out(Easing.cubic) },
          () => {
            'worklet';
            if (!flightActive.value) return; // interrupted by a gesture
            flightActive.value = false;
            camX.value = next.x;
            camY.value = next.y;
            camZoom.value = next.zoom;
            driving.value = false;
            committedZoom.value = next.zoom;
            runOnJS(commitNow)(next.x, next.y, next.zoom);
          },
        );
      });

    // Pan and pinch are one gesture — a two-finger move is both. The double tap races them: once a
    // drag has begun, gesture-handler will not also resolve a tap.
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), doubleTap);
    // Every closure here is over a shared value, a ref-backed callback or a mutable object literal —
    // all stable identities. Listing them would rebuild the tree on renders that must not disturb an
    // in-flight gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- reading the live pose from the JS thread ---------- */

  const toWorldLive = useCallback(
    (at: Point): Point => {
      const vp = law.value.viewport;
      const z = camZoom.value;
      return {
        x: camX.value + (at.x - vp.width / 2) / z,
        y: camY.value + (at.y - vp.height / 2) / z,
      };
    },
    [law, camX, camY, camZoom],
  );

  return {
    onLayout,
    camX,
    camY,
    camZoom,
    camera,
    view,
    bounds,
    viewport,
    relZoom: camera.zoom / fit,
    relZoomMax: limits.max / fit,
    fitTo,
    flyTo,
    panZoomGesture,
    toWorldLive,
    liveWorldPerPx,
    measured,
  };
}
