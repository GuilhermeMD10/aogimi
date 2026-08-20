// ═══════════════════════════════════════════════════════════════════════════
// MOTION — the app's four durations, ported from the web
// ═══════════════════════════════════════════════════════════════════════════
//
// The web's whole motion vocabulary is four values, and they are named in two
// files: `--transition` in `styles/ds-tokens.css` ("deliberately the only
// transition on the page") and three `--glass-*` ones in `styles/glass.css`.
// This is that set, in one place, so a press on mobile is timed like a press on
// the web rather than like whatever the component author felt.
//
// **Mobile has no hover**, so the web's hover fades collapse into the press
// state: `PRESS` is the transform nudge, `SURFACE` the fill/ink fade that a
// hovered control gets there and a pressed one gets here.
//
// ── Motion was stripped on purpose, and this is the replacement ────────────
// Every `({ pressed }) => …` callback in the app was deleted in the 2026-08-10
// pass so the redesign would start from nothing. The dock was the one exception
// — it kept the web's nudge and its sliding pill — and its two hardcoded
// figures are the ones below, now shared. `shared/components/Touchable` is the
// only thing that should read `PRESS`; screens get the treatment by using it.

import { Easing } from 'react-native';

/** `--glass-press: 120ms ease` — the press nudge. Faster than the surface fade
 *  on purpose: a press has to feel like contact. */
export const PRESS_MS = 120;

/** `--transition: 120ms ease` — the app-wide fade the web puts on background
 *  and colour. Same figure as the press; kept as its own name because the two
 *  are re-balanced independently. */
export const FADE_MS = 120;

/** `--glass-transition: 180ms ease` — glass fill / border / ink. Deliberately
 *  slower and softer than `FADE_MS`. */
export const SURFACE_MS = 180;

/** `--dock-glass-slide: 280ms cubic-bezier(0.4, 0, 0.2, 1)` — the standard
 *  decelerate curve, used by the dock's sliding pill. */
export const SLIDE_MS = 280;

export const EASE = Easing.inOut(Easing.quad);
export const DECELERATE = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * `.glass-press:active` → `transform: translateY(1px) scale(0.985)`.
 *
 * Both halves matter: the translate is the contact and the scale is the give.
 * The web puts this behind `prefers-reduced-motion`, and so does
 * `useReduceMotion()` below.
 */
export const PRESS_TRANSLATE_Y = 1;
export const PRESS_SCALE = 0.985;

/**
 * Minimum tap target, in points — Apple's HIG figure and Material's 48dp
 * rounded to the smaller of the two.
 *
 * The app used to hit this with `hitSlop`: 55 call sites at five different
 * values, each patching a control sized to its glyph. Slop is invisible, so a
 * control still *looked* 20px wide and users still aimed at 20px. The rule now
 * is that the padded visual box **is** the target, and `Touchable` enforces the
 * floor with `minWidth`/`minHeight` rather than slop.
 */
export const MIN_TARGET = 44;
