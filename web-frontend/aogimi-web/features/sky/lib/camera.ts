import { FOCUS_MAX_ZOOM, FOCUS_ZOOM_HEADROOM, MAX_ZOOM } from './config';
import { clamp } from './geometry';
import type { Bounds, Camera, Insets, Point, View, Viewport } from './types';

/**
 * Pan/zoom maths over a window onto the sky. Pure functions of (camera, bounds, viewport), with
 * no notion of what is drawn, what device is drawing it, or what gesture moved it — a wheel and
 * a pinch both arrive here as a plain zoom multiplier.
 *
 * Every fit- and clamp-shaped function also takes optional `Insets` — the host's overlays,
 * subtracted from the viewport so the sky rests centred in the *uncovered* window. Only where the
 * camera settles knows about them: `toWorld`/`viewOf` map the full element, because the sky is
 * still drawn (and picked) under the chrome, just not parked there.
 */

export const boundsCentre = (b: Bounds): Point => ({
  x: (b.minX + b.maxX) / 2,
  y: (b.minY + b.maxY) / 2,
});

/** The viewport with the insets taken off — what a fit must actually fit into. Floored at 1px so
 *  a host whose window shrank under its own chrome degrades instead of dividing through. */
const innerW = (vp: Viewport, ins?: Insets) => Math.max(1, vp.width - (ins ? ins.left + ins.right : 0));
const innerH = (vp: Viewport, ins?: Insets) => Math.max(1, vp.height - (ins ? ins.top + ins.bottom : 0));

/**
 * Where the centre of the inset window sits, as a world offset from what the camera's own centre
 * shows. Asymmetric insets shift the resting point — a panel on the left pushes the sky right —
 * and dividing by the zoom is what keeps that shift a fixed number of *pixels* at every scale.
 */
const insetShift = (zoom: number, ins?: Insets): Point =>
  ins ? { x: (ins.left - ins.right) / (2 * zoom), y: (ins.top - ins.bottom) / (2 * zoom) } : { x: 0, y: 0 };

/**
 * Grow a box to the viewport's own aspect ratio, about its centre. Exactly one axis grows and
 * neither ever shrinks, so everything the box held is still inside it — but a fit of the result
 * now covers the viewport on *both* axes, which makes the boundary and the container the same
 * rectangle instead of one letterboxed inside the other. Degenerate inputs pass through untouched
 * rather than dividing through the maths.
 */
export const matchAspect = (b: Bounds, vp: Viewport, ins?: Insets): Bounds => {
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  if (w <= 0 || h <= 0 || vp.width <= 0 || vp.height <= 0) return b;

  // the inset window's aspect, so the boundary matches the box the sky actually rests in
  const aspect = innerW(vp, ins) / innerH(vp, ins);
  const { x, y } = boundsCentre(b);
  const halfW = Math.max(w, h * aspect) / 2;
  const halfH = Math.max(h, w / aspect) / 2;
  return { minX: x - halfW, minY: y - halfH, maxX: x + halfW, maxY: y + halfH };
};

/**
 * The zoom at which the sky's box just fits the viewport — where a fit lands, and the floor for
 * zooming out, since pulling back further would only add void outside the boundary.
 *
 * The smaller of the two axis ratios, so the box is covered on both; the longer axis of a
 * viewport that is not square simply shows a little space past the boundary. That is also what
 * makes the fully zoomed-out view sit centred and immobile: at this zoom neither axis has slack.
 */
export const fitZoom = (b: Bounds, vp: Viewport, ins?: Insets) =>
  Math.min(MAX_ZOOM, innerW(vp, ins) / (b.maxX - b.minX), innerH(vp, ins) / (b.maxY - b.minY));

/**
 * The zoom ceiling a *focused deck* earns from its own spread — see FOCUS_MAX_ZOOM in config.ts.
 * The unclamped fill-the-window zoom times a headroom factor, floored at MAX_ZOOM (a deck dense
 * enough to fill the window at MAX_ZOOM keeps exactly today's cap) and capped at FOCUS_MAX_ZOOM
 * (a one-star deck must not blow a single glyph up without limit). fitZoom — the resting fit, the
 * zoom-out floor, the outer view — never reads this: only how far *in* the wheel may go changes.
 */
export const maxZoomFor = (b: Bounds, vp: Viewport, ins?: Insets): number => {
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  if (w <= 0 || h <= 0) return MAX_ZOOM; // degenerate box: keep the constant cap, not Infinity
  const rawFit = Math.min(innerW(vp, ins) / w, innerH(vp, ins) / h);
  return clamp(rawFit * FOCUS_ZOOM_HEADROOM, MAX_ZOOM, FOCUS_MAX_ZOOM);
};

/** Zoom is bounded below by the sky, above by the ceiling — MAX_ZOOM unless the host passes the
 *  focused tier's adaptive one (`maxZoomFor`). */
export const clampZoom = (z: number, b: Bounds, vp: Viewport, ins?: Insets, maxZoom = MAX_ZOOM) =>
  clamp(z, fitZoom(b, vp, ins), maxZoom);

/** Viewport px -> world, under a given camera. */
export const toWorld = (local: Point, cam: Camera, vp: Viewport): Point => ({
  x: cam.x + (local.x - vp.width / 2) / cam.zoom,
  y: cam.y + (local.y - vp.height / 2) / cam.zoom,
});

export const viewOf = (cam: Camera, vp: Viewport): View => {
  const spanX = vp.width / cam.zoom;
  const spanY = vp.height / cam.zoom;
  return {
    minX: cam.x - spanX / 2,
    minY: cam.y - spanY / 2,
    spanX,
    spanY,
    worldPerPx: 1 / cam.zoom,
  };
};

/**
 * The visible rectangle as a box, grown by a factor of its own size — the shape culling tests
 * against. `margin` is proportional rather than absolute so it means the same thing at every
 * zoom: a twelve percent skirt is twelve percent of a screen whether that screen is showing the
 * whole sky or one constellation.
 */
export const viewBounds = (v: View, margin = 1): Bounds => {
  const growX = (v.spanX * (margin - 1)) / 2;
  const growY = (v.spanY * (margin - 1)) / 2;
  return {
    minX: v.minX - growX,
    minY: v.minY - growY,
    maxX: v.minX + v.spanX + growX,
    maxY: v.minY + v.spanY + growY,
  };
};

/**
 * Drag the sky by (dxPx, dyPx), so the camera travels the opposite way. `cam` is the pose at the
 * moment of the press, not the live one, which is what keeps a drag drift-free.
 */
export const panBy = (cam: Camera, dxPx: number, dyPx: number): Camera => ({
  x: cam.x - dxPx / cam.zoom,
  y: cam.y - dyPx / cam.zoom,
  zoom: cam.zoom,
});

/**
 * Multiply the zoom about a viewport point, keeping the world point under it pinned there.
 *
 * Takes a multiplier rather than an input delta, so a wheel on the web and a pinch on a phone
 * can each map their own gesture onto this one function. Returns `cam` untouched when already
 * against a zoom limit; the limits are applied here rather than to the result, because the
 * pinning maths needs the final zoom.
 */
export const zoomAround = (
  cam: Camera,
  local: Point,
  factor: number,
  b: Bounds,
  vp: Viewport,
  ins?: Insets,
  maxZoom = MAX_ZOOM,
): Camera => {
  const zoom = clampZoom(cam.zoom * factor, b, vp, ins, maxZoom);
  if (zoom === cam.zoom) return cam;

  const anchor = toWorld(local, cam, vp);
  return {
    x: anchor.x - (local.x - vp.width / 2) / zoom,
    y: anchor.y - (local.y - vp.height / 2) / zoom,
    zoom,
  };
};

/** Centre on the sky's box within the inset window, pulled back exactly far enough to hold it. */
export const cameraFitting = (b: Bounds, vp: Viewport, ins?: Insets): Camera => {
  const zoom = fitZoom(b, vp, ins);
  const centre = boundsCentre(b);
  const shift = insetShift(zoom, ins);
  return { x: centre.x - shift.x, y: centre.y - shift.y, zoom };
};

/** Decelerating ease for camera flights: most of the distance early, a soft landing. */
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * The pose a camera flight passes through at progress `k` (0..1, already eased).
 *
 * Zoom interpolates in log space: zoom is a ratio, so equal steps of `k` should multiply it by
 * equal factors — interpolated linearly, a flight into a deck spends almost all of its frames
 * nearly arrived and then lurches through the last doubling. Position interpolates linearly,
 * which with log zoom is the plain version of the standard smooth pan-and-zoom path.
 *
 * Pure like the rest of this file: no clock, no easing of its own, no notion of what is flying.
 * The host decides the duration and the curve; a mid-flight pose may legitimately sit outside
 * the destination tier's bounds, which is why the caller must not clamp it until it lands.
 */
export const tweenCamera = (from: Camera, to: Camera, k: number): Camera => ({
  x: from.x + (to.x - from.x) * k,
  y: from.y + (to.y - from.y) * k,
  zoom: Math.exp(Math.log(from.zoom) * (1 - k) + Math.log(to.zoom) * k),
});

/**
 * Confine the viewport to the sky's box, in all three degrees of freedom.
 *
 * Zoom is floored at fitZoom, so you cannot pull back past the boundary into empty space.
 * Position may then travel only as far as the slack between the box and the *inset window*
 * allows; where the sky is narrower than the window that slack is zero, so the camera pins to
 * the (inset-shifted) centre and that axis stops panning. At the zoom floor both slacks are zero
 * by construction, which is why the fully zoomed-out view sits fitted and immobile.
 *
 * Returns `cam` untouched when already legal, so an in-bounds gesture causes no extra render.
 */
export const clampCamera = (
  cam: Camera,
  b: Bounds,
  vp: Viewport,
  ins?: Insets,
  maxZoom = MAX_ZOOM,
): Camera => {
  const zoom = clampZoom(cam.zoom, b, vp, ins, maxZoom);
  const centre = boundsCentre(b);
  const shift = insetShift(zoom, ins);
  const slackX = Math.max(0, (b.maxX - b.minX) / 2 - innerW(vp, ins) / (2 * zoom));
  const slackY = Math.max(0, (b.maxY - b.minY) / 2 - innerH(vp, ins) / (2 * zoom));

  const x = clamp(cam.x, centre.x - shift.x - slackX, centre.x - shift.x + slackX);
  const y = clamp(cam.y, centre.y - shift.y - slackY, centre.y - shift.y + slackY);
  return x === cam.x && y === cam.y && zoom === cam.zoom ? cam : { x, y, zoom };
};
