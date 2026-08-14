import type { Bounds, Camera, Insets, Point, Viewport } from '../lib/types';

/**
 * The camera's clamp law, **as worklets** — a deliberate, guarded mirror of `lib/camera.ts`.
 *
 * ── Why this file exists at all ──────────────────────────────────────────────────────────────────
 * The Skia renderer drives pan and zoom from Reanimated shared values so a gesture never touches the
 * JS thread. A gesture handler running on the UI thread must therefore be able to *clamp* — a drag
 * that could leave the sky's box, or a pinch past the zoom ceiling, has to be stopped in the frame it
 * happens, not corrected a render later.
 *
 * `lib/camera.ts` cannot be called from there. Reanimated's babel plugin only workletizes an imported
 * function under `bundleMode` (its `workletizableModules` option is gated on it — see
 * `react-native-worklets/plugin`), which is experimental and would apply bundle-wide. And `lib/` is a
 * **byte-identical copy of the web's**, asserted by `npm run verify:sky`, so adding a `'worklet'`
 * directive to it is not an option either: that is the one edit the harness exists to forbid.
 *
 * So the law is stated twice. The repo's answer to a necessary mirror is always the same — FSRS-6
 * lives in three copies with three harnesses — and this follows it: **`npm run verify:camera`
 * asserts these functions agree with `lib/camera.ts` to the bit** over a few thousand randomised
 * poses, including the degenerate boxes and the inset-shifted ones. Change one, change both, run it.
 *
 * ── What is mirrored, and what is not ────────────────────────────────────────────────────────────
 * Only the four functions a *gesture* needs. Everything about where the camera comes to *rest* —
 * `cameraFitting`, `focusLimits`, `matchAspect`, `tweenCamera`, the flight easing — stays on the JS
 * thread in `hooks/useSkyCamera.ts`, calling the real lib. That split is the point: the **policy** (what
 * the limits are, where a fit lands) has one home, and only the **enforcement** is duplicated, which
 * is twenty lines of arithmetic over plain numbers.
 *
 * Every function here takes `ZoomLimits` as two explicit numbers rather than the lib's object with
 * its `DEFAULT_LIMITS` default. A worklet cannot close over a module-level object from `lib/`, and an
 * implicit default is exactly the kind of divergence a mirror must not have — the caller resolves the
 * pair on the JS thread and hands it over.
 */

/** `lib/geometry.ts`'s `clamp`, inlined — importing it would be a second cross-module worklet call. */
const clampW = (v: number, lo: number, hi: number) => {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
};

/** `lib/camera.ts`'s `innerW`/`innerH` — the viewport with the host's chrome taken off, floored at
 *  1px so a window shrunk under its own overlays degrades instead of dividing through. */
const innerW = (vp: Viewport, ins: Insets | null) => {
  'worklet';
  return Math.max(1, vp.width - (ins ? ins.left + ins.right : 0));
};

const innerH = (vp: Viewport, ins: Insets | null) => {
  'worklet';
  return Math.max(1, vp.height - (ins ? ins.top + ins.bottom : 0));
};

/** `lib/camera.ts`'s `insetShift`. Dividing by the zoom is what keeps an asymmetric inset's shift a
 *  fixed number of *pixels* at every scale. */
const insetShiftX = (zoom: number, ins: Insets | null) => {
  'worklet';
  return ins ? (ins.left - ins.right) / (2 * zoom) : 0;
};

const insetShiftY = (zoom: number, ins: Insets | null) => {
  'worklet';
  return ins ? (ins.top - ins.bottom) / (2 * zoom) : 0;
};

/**
 * Mirror of `fitZoom`. The smaller of the two axis ratios, capped by `limFit`, so the box is covered
 * on both axes and a capped fit is pulled back further than the box needs — never closer.
 */
export const fitZoomW = (
  b: Bounds,
  vp: Viewport,
  ins: Insets | null,
  limFit: number,
): number => {
  'worklet';
  return Math.min(limFit, innerW(vp, ins) / (b.maxX - b.minX), innerH(vp, ins) / (b.maxY - b.minY));
};

/** Mirror of `clampZoom`: floored at the box's own fit, capped at the tier's ceiling. */
export const clampZoomW = (
  z: number,
  b: Bounds,
  vp: Viewport,
  ins: Insets | null,
  limFit: number,
  limMax: number,
): number => {
  'worklet';
  return clampW(z, fitZoomW(b, vp, ins, limFit), limMax);
};

/** Mirror of `toWorld`: viewport px → world, under a given camera. Note it maps the **full** element,
 *  not the inset window — the sky is still drawn and picked under the chrome, just not parked there. */
export const toWorldW = (local: Point, cam: Camera, vp: Viewport): Point => {
  'worklet';
  return {
    x: cam.x + (local.x - vp.width / 2) / cam.zoom,
    y: cam.y + (local.y - vp.height / 2) / cam.zoom,
  };
};

/**
 * Mirror of `clampCamera` — the sky's box confining all three degrees of freedom.
 *
 * At the zoom floor both slacks are zero by construction, which is why the fully pulled-back view
 * sits fitted and immobile. Unlike the lib's version this always returns a fresh object: the identity
 * short-circuit exists there to spare React a render, and on the UI thread there is no render to
 * spare. The harness compares by value, so the two still agree.
 */
export const clampCameraW = (
  cam: Camera,
  b: Bounds,
  vp: Viewport,
  ins: Insets | null,
  limFit: number,
  limMax: number,
): Camera => {
  'worklet';
  const zoom = clampZoomW(cam.zoom, b, vp, ins, limFit, limMax);
  const centreX = (b.minX + b.maxX) / 2;
  const centreY = (b.minY + b.maxY) / 2;
  const shiftX = insetShiftX(zoom, ins);
  const shiftY = insetShiftY(zoom, ins);
  const slackX = Math.max(0, (b.maxX - b.minX) / 2 - innerW(vp, ins) / (2 * zoom));
  const slackY = Math.max(0, (b.maxY - b.minY) / 2 - innerH(vp, ins) / (2 * zoom));

  return {
    x: clampW(cam.x, centreX - shiftX - slackX, centreX - shiftX + slackX),
    y: clampW(cam.y, centreY - shiftY - slackY, centreY - shiftY + slackY),
    zoom,
  };
};

/**
 * Mirror of `zoomAround` — multiply the zoom about a viewport point, keeping the world point under it
 * pinned there. Returns the pose unchanged when already against a limit; the limits are applied to
 * the zoom rather than to the result because the pinning maths needs the final zoom.
 */
export const zoomAroundW = (
  cam: Camera,
  local: Point,
  factor: number,
  b: Bounds,
  vp: Viewport,
  ins: Insets | null,
  limFit: number,
  limMax: number,
): Camera => {
  'worklet';
  const zoom = clampZoomW(cam.zoom * factor, b, vp, ins, limFit, limMax);
  if (zoom === cam.zoom) return cam;

  const anchor = toWorldW(local, cam, vp);
  return {
    x: anchor.x - (local.x - vp.width / 2) / zoom,
    y: anchor.y - (local.y - vp.height / 2) / zoom,
    zoom,
  };
};

/**
 * The legal travel of the camera's centre at a **fixed** zoom, as four numbers.
 *
 * This is `clampCameraW`'s position half, factored out for the one caller that needs the range rather
 * than the clamp: a fling. `withDecay` takes `clamp: [lo, hi]` once at release and then runs entirely
 * inside Reanimated, so the bounds have to be resolved up front — which is sound precisely because a
 * fling never changes the zoom, and the range only depends on zoom.
 *
 * The harness asserts `clamp(cam.x, …panRangeW)` equals `clampCameraW(cam).x`, so this cannot drift
 * from the law it is factored out of.
 */
export const panRangeW = (
  zoom: number,
  b: Bounds,
  vp: Viewport,
  ins: Insets | null,
): { xLo: number; xHi: number; yLo: number; yHi: number } => {
  'worklet';
  const centreX = (b.minX + b.maxX) / 2;
  const centreY = (b.minY + b.maxY) / 2;
  const restX = centreX - insetShiftX(zoom, ins);
  const restY = centreY - insetShiftY(zoom, ins);
  const slackX = Math.max(0, (b.maxX - b.minX) / 2 - innerW(vp, ins) / (2 * zoom));
  const slackY = Math.max(0, (b.maxY - b.minY) / 2 - innerH(vp, ins) / (2 * zoom));
  return { xLo: restX - slackX, xHi: restX + slackX, yLo: restY - slackY, yHi: restY + slackY };
};
