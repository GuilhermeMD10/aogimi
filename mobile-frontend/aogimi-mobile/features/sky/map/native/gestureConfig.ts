/**
 * Tuning for the **native** camera's gesture feel — momentum, rubber band, double-tap, and how often
 * the UI thread's live pose is committed back to React.
 *
 * Deliberately **not** in `lib/config.ts`. That file is the byte-identical copy `verify:sky` guards,
 * and every number in it describes the sky itself: where stars go, what a rank looks like, when a
 * layer crossfades. None of these describe the sky — they describe a finger on glass, which the web
 * does not have and never will. Putting them there would mean the web carrying constants for a
 * gesture it cannot receive, and a `verify:sky` failure the first time either was tuned.
 *
 * The shared numbers a gesture *does* answer to — `DRAG_SLOP_PX`, `ESCAPE_PUSH_PX`,
 * `ESCAPE_PUSH_DECAY_MS`, `ZOOM_PER_WHEEL_PX`, `CAMERA_TWEEN_MS` — stay in `lib/config.ts` and are
 * imported. They mean the same thing on both platforms and are meant to be tuned once.
 */

/**
 * How far the camera coasts after a flick. Reanimated's `withDecay` deceleration: 0.998 is its
 * default and reads as ice, 0.99 stops almost immediately. The sky is a place you *look around*
 * rather than a list you throw, so this sits nearer the short end — enough that a flick crosses a
 * deck, not enough that it sails past the one you were aiming at.
 */
export const FLING_DECELERATION = 0.994;

/**
 * Below this speed a release is a stop, not a flick (px/s at the pointer). Without a floor, letting
 * go of a slow drag adds a last few pixels of drift that reads as the sky slipping out from under
 * your finger.
 */
export const FLING_MIN_VELOCITY = 90;

/**
 * How much of an out-of-bounds drag actually moves the camera, past the edge. A finger dragged
 * beyond the boundary travels this fraction of the distance, so the sky follows but visibly resists;
 * releasing springs it back to the edge.
 *
 * The web has no counterpart — a wheel against a hard clamp is fine on a mouse, but a finger that
 * stops responding while still moving reads as a dropped touch.
 */
export const RUBBER_BAND = 0.32;

/** How far past the edge the rubber band may ever stretch, as a fraction of the viewport. Keeps a
 *  hard flick from parking the sky entirely off screen before the spring catches it. */
export const RUBBER_BAND_MAX = 0.28;

/** Spring back from an overscrolled pose. Critically damped — an overshoot here would read as the
 *  boundary bouncing, and the boundary is meant to be the one thing that does not move. */
export const RUBBER_SPRING = { damping: 22, stiffness: 190, mass: 0.7 } as const;

/** A double tap zooms in by this factor, about the tapped point — the phone's equivalent of a few
 *  notches of wheel, and the one gesture that reaches a star without a pinch. */
export const DOUBLE_TAP_ZOOM = 2.2;

/**
 * How much the live zoom may drift from the committed one before React is told, as a **ratio**.
 *
 * This is the whole cost model of the native renderer. Pan commits nothing — the picture is world
 * space and the camera is a matrix, so a pan is free. Zoom is different: the LOD (which stars exist,
 * which layer is up, how big a star is in world units) is a function of the committed zoom, so a
 * pinch has to hand back to React eventually or the sky stops answering. Every commit is a React
 * render plus a picture rebuild.
 *
 * 1.08 is roughly one wheel notch: during a pinch the LOD steps a dozen or so times instead of
 * sixty, and each step is small enough to read as the sky resolving rather than as a jump. Raise it
 * for fewer, coarser corrections; lower it and a pinch approaches the per-frame cost the SVG
 * renderer paid.
 */
export const COMMIT_ZOOM_RATIO = 1.08;

/**
 * How much the zoom **gives** when pinched out past a focused deck's fit, before springing back.
 *
 * Leaving a deck is meant to feel deliberate, and a hard wall does not communicate that — the pinch
 * simply stops responding, which reads as a dropped gesture rather than as a boundary. So the zoom is
 * allowed past the floor, heavily damped: the sky keeps answering the fingers, visibly resists, and
 * springs back unless the shove clears `ESCAPE_PUSH_PX` (at which point the deck is left).
 *
 * `GIVE` is the fraction of the over-pinch that actually lands; `GIVE_MAX` caps the total, as a
 * divisor on the floor zoom — 1.18 means you can never pull back more than ~15% past the fitted view,
 * however hard you pinch.
 */
export const ZOOM_GIVE = 0.35;
export const ZOOM_GIVE_MAX = 1.18;
