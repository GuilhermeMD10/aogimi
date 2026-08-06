'use client';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

type Drag = {
  id: number; // the pointer we are following
  from: Point; // where it went down, in viewport px
  cam: Camera; // the pose at that moment; every move is measured from here, so no drift
  moved: boolean; // has it passed DRAG_SLOP_PX yet
};

/**
 * Either a definite pose, the intent to frame the whole of `bounds`, or one frame of a flight.
 *
 * Keeping "fit" as an intent rather than resolving it to numbers means it re-resolves against
 * whatever the bounds are when read — so fitting right after a build frames the new sky, not the
 * one that was there when the button was pressed, and entering a deck frames that deck without
 * anyone computing a pose for it. It also makes the view follow a sky that is still growing,
 * until you touch it.
 *
 * A flight pose is a camera that is deliberately **not clamped**: the path between two tiers
 * legitimately passes outside the destination's box (its zoom starts below the new floor), and
 * clamping any frame of it would snap the zoom to that floor and end the flight before it began.
 * It also passes through a lock — returning to the locked outer view is itself a flight, and the
 * lock re-asserts the moment it lands or is interrupted.
 */
type Pose = Camera | 'fit' | { flight: Camera };

const isFlight = (p: Pose): p is { flight: Camera } => p !== 'fit' && 'flight' in p;

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
  /** The largest `relZoom` this tier permits — the anchor for anything that ramps with "how far in
   *  you are", since the absolute ceiling means something different per tier and per deck. */
  relZoomMax: number;
  /** Frame the whole of `bounds`, now and as it grows, until a gesture takes over. */
  fitTo: () => void;
  /**
   * Fly to a pose over CAMERA_TWEEN_MS with a decelerating ease, instead of jumping there.
   *
   * A `'fit'` target re-resolves against the bounds **every frame**, so a flight started in the
   * same commit that changes them (entering a deck, leaving one) still lands on the new tier's
   * fit — and hands the pose back to the `'fit'` intent on arrival, so nothing about the resting
   * state differs from having jumped. The departure pose is the camera as of the last commit,
   * which during a focus-change commit is still the view the reader was just looking at.
   *
   * Interruptible: any pan or wheel takes over mid-flight and the flight simply never arrives —
   * `onArrive` fires only on an actual landing, which is what lets a caller sequence work
   * (select a star, say) behind the camera genuinely getting there.
   */
  flyTo: (target: Camera | 'fit', onArrive?: () => void) => void;
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
   * Called when a zoom-out is *pushed* while already fully pulled back. The gesture has nowhere left
   * to go at this tier, which is exactly the moment it should mean "leave" — so backing out of a
   * deck is the same wheel motion that got you around inside it, rather than a separate control.
   *
   * Not on the first notch past the floor: the over-scroll has to accumulate past ESCAPE_PUSH_PX
   * first (see the constant), so a flick that merely lands back on the fitted view rests there.
   */
  onZoomOutFloor?: () => void;
  /**
   * How much of each viewport edge the host's overlays cover, in CSS px — a glass column on the
   * left, a ledger below. Subtracted from the viewport before every fit and clamp, so the sky
   * rests centred in the uncovered window rather than under the chrome. Compared **by value**:
   * hosts build the object per render, and a change of the numbers re-fits the camera as a
   * flight (the handover's panel-toggle refit), not a jump.
   */
  insets?: Insets;
  /**
   * Let both zoom limits adapt to the bounds (`focusLimits`): the resting fit fills the window
   * instead of stopping at MAX_ZOOM (capped at FOCUS_FIT_MAX_ZOOM), and the ceiling rises with it
   * (capped at FOCUS_MAX_ZOOM). The focused-deck tier turns this on — its box is one deck's own
   * spread, and a few-card deck deserves to fill the view rather than float in the middle of it.
   * Off (the default) both limits are the constant MAX_ZOOM, as the outer tier and the demo expect.
   * The floor is still the fit, whatever the fit resolved to, so wheel-out-at-fit still means
   * "leave" — it just contains the deck at a closer zoom than it used to.
   */
  adaptiveZoomLimits?: boolean;
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
  // below — the memos, the refit effect — must key on the numbers, not the wrapper's identity.
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets ?? {};
  const ins = useMemo<Insets | undefined>(
    () => (top || right || bottom || left ? { top, right, bottom, left } : undefined),
    [top, right, bottom, left],
  );

  // resolved once here, so every path below — the clamp, the zoom floor, the gesture handlers
  // reading through the ref — is confined to the same box and none can disagree about the edge
  const bounds = useMemo(
    () => (fillViewport ? matchAspect(rawBounds, viewport, ins) : rawBounds),
    [rawBounds, viewport, fillViewport, ins],
  );

  // the fit cap and the ceiling every clamp below applies — resolved once here like `bounds` is, so
  // the wheel, a pan's clamp and a flight's landing can never disagree about where the edges are
  const limits = useMemo(
    () => (adaptiveZoomLimits ? focusLimits(bounds, viewport, ins) : DEFAULT_LIMITS),
    [adaptiveZoomLimits, bounds, viewport, ins],
  );

  // bounds grow as the sky does and the viewport changes as the window does, but the listeners
  // are attached once. Reading these through refs keeps them (and the gesture handlers) stable.
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

  // A locked camera is not a pose that happens to be fitted — it is the *intent* to be fitted, so
  // it keeps re-resolving as the bounds change and cannot be left stale by a gesture that raced it.
  // A flight passes through the lock (see Pose); everything else defers to it.
  const effective: Pose = isFlight(pose) ? pose : locked ? 'fit' : pose;

  // the camera is confined on the way *out* rather than on the way in. Growing the sky only adds
  // slack, but entering a deck shrinks the box under a camera that was legal a moment ago —
  // deriving the clamp here handles that without a correcting render, and guarantees no consumer
  // can ever observe an out-of-bounds camera. The one exception is a flight frame, whose whole
  // point is to cross the boundary the clamp enforces — see Pose.
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

  // The flight's departure pose, read through a ref like the bounds are. Synced after the commit,
  // so during the commit that changes focus it still holds the camera the reader was just looking
  // at — exactly the pose a flight into the new tier should depart from.
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  });

  /* ---------- leaving the tier: the accumulated over-scroll ---------- */

  // How much wheel-out has been spent against the floor, and when the last of it arrived. A ref and
  // not state: nothing renders from it, and it must survive every commit the wheel provokes.
  const pushRef = useRef({ px: 0, at: 0 });

  /* ---------- flights ---------- */

  const flightRef = useRef<{ raf: number; onArrive?: () => void } | null>(null);

  /** End any flight. An interrupted one (a gesture took over) lands where it is, clamped back
   *  inside the law — or back on the fit intent when locked, where a free pose means nothing. */
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
      // on screen this very commit, so the first painted frame is the departure — never a fit of
      // the new bounds that the flight then appears to jump back from
      setPose({ flight: from });

      const step = (now: number) => {
        if (flightRef.current !== flight) return; // a newer flight or a gesture took over
        const b = boundsRef.current;
        const vp = viewportRef.current;
        const iv = insRef.current;
        // 'fit' resolves per frame, so a flight racing a bounds or insets change still lands on
        // the new fit
        const to = target === 'fit' ? cameraFitting(b, vp, iv, limitsRef.current) : target;
        const k = Math.min(1, (now - start) / CAMERA_TWEEN_MS);
        if (k >= 1) {
          // land on the intent (or the clamped pose), so the resting state is exactly what a
          // jump would have produced — nothing downstream can tell the two apart afterwards
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
  // An insets change is the host's chrome moving — a panel toggling, a tier swapping its
  // overlays — and the camera answers it by re-fitting, as a flight rather than a jump (the
  // handover's panel-toggle behaviour). A layout effect, so the departure pose is committed
  // before the re-fit frame paints. Skipped on mount (nothing to depart from) and while a flight
  // is already running — a running 'fit' target re-resolves against the new insets every frame,
  // and restarting it would only discard its onArrive.
  const prevInsRef = useRef(ins);
  useLayoutEffect(() => {
    if (prevInsRef.current === ins) return;
    prevInsRef.current = ins;
    if (flightRef.current) return;
    // legitimate sync-from-external-trigger (the AppShell pending-field precedent): the flight's
    // departure pose must be committed in response to the prop change, guarded to fire once per
    // change — flyTo here is exactly what SkyMap's own focus-change effect already does
    // eslint-disable-next-line react-hooks/set-state-in-effect
    flyTo('fit');
  }, [ins, flyTo]);

  const view = useMemo(() => viewOf(camera, viewport), [camera, viewport]);
  // the fitted zoom of the current bounds, which both figures below are expressed against
  const fit = useMemo(() => fitZoom(bounds, viewport, ins, limits), [bounds, viewport, ins, limits]);
  // relative to a fit of the *current* bounds, so 1.0 means "this tier, fully framed" whether that
  // tier is the whole sky or one deck. An absolute zoom would mean something different in each.
  const relZoom = camera.zoom / fit;
  // ...and how far in this tier lets a gesture go, in the same currency: the ceiling a star's size
  // ramp is anchored to, so "fully zoomed in" means the same thing in a sparse deck and a dense one.
  const relZoomMax = limits.max / fit;

  const fitTo = useCallback(() => setPose('fit'), []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      stopFlight(false); // a press takes the camera back from a flight
      // capture on the viewport, so a drag keeps tracking once the cursor leaves it
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { id: e.pointerId, from: localOf(e.currentTarget, e), cam: camera, moved: false };
      setDragging(true);
    },
    [camera, stopFlight],
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
      // The wheel takes over from a flight — except at the locked outer view, where the wheel is
      // otherwise inert and a momentum tail arriving mid-return-flight must not cut it short.
      if (flightRef.current) {
        if (lockedRef.current) return;
        stopFlight(false);
      }
      const b = boundsRef.current;
      const vp = viewportRef.current;
      const iv = insRef.current;
      // the wheel's own feel is decided here. Exponential, so a notch means the same proportional
      // change at every scale — and it reaches the shared maths as a plain multiplier, which is
      // what lets a pinch gesture drive the identical code path
      const factor = Math.exp(-e.deltaY * ZOOM_PER_WHEEL_PX);

      // Pushing back when there is nothing left to pull back to is what leaves a tier. Read off the
      // floor rather than from a click target, so it works the same at whatever depth.
      // Decided here against the last *rendered* camera, never inside the setPose updater: React
      // runs updaters during render, and escaping navigates (the host's onZoomOutFloor pushes a
      // route), which is illegal mid-render. The ref lags at most one commit — a rapid burst just
      // rests at the floor (clampCamera pins it there) and keeps accruing against it.
      if (factor < 1) {
        const lim = limitsRef.current;
        const floor = fitZoom(b, vp, iv, lim);
        if (cameraRef.current.zoom <= floor + 1e-9) {
          // At the wall. Accumulate the shove instead of leaving on the first notch — a flick that
          // merely lands back on the fitted view spends its tail here and goes no further, while a
          // second deliberate push clears the threshold. See ESCAPE_PUSH_PX.
          const push = pushRef.current;
          if (e.timeStamp - push.at > ESCAPE_PUSH_DECAY_MS) push.px = 0;
          push.at = e.timeStamp;
          push.px += Math.abs(e.deltaY);
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
          return clampCamera(zoomAround(from, localOf(el, e), factor, b, vp, iv, lim), b, vp, iv, lim);
        });
        return;
      }

      // any zoom-in abandons whatever was being pushed against the floor
      pushRef.current.px = 0;
      if (lockedRef.current) return; // the outer view has nothing to zoom into but a deck
      // zoomAround applies the zoom ceiling itself (its pinning maths needs the final zoom);
      // clampCamera then pulls the position back in
      const local = localOf(el, e);
      setPose((current) => {
        const lim = limitsRef.current;
        const from =
          current === 'fit'
            ? cameraFitting(b, vp, iv, lim)
            : isFlight(current)
              ? current.flight
              : current;
        return clampCamera(zoomAround(from, local, factor, b, vp, iv, lim), b, vp, iv, lim);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      observer.disconnect();
      el.removeEventListener('wheel', onWheel);
    };
    // stopFlight is stable (useCallback, no deps), so the listener is still attached exactly once
  }, [stopFlight]);

  return {
    attach,
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
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
