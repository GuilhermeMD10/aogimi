import { Skia, TileMode, type SkPaint } from '@shopify/react-native-skia';

import type { ColorStop, GroupTint, RankRamp } from '../lib/palette';
import {
  beadRamps,
  haloStops,
  hotStops,
  lobeStops,
  quantiseColor,
  quantiseTint,
  rgbOf,
  tintKey,
  washStops,
} from '../lib/palette';

/**
 * Every radial gradient the sky paints, as reusable `SkPaint`s **on the unit circle**.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────────────────────────
 * SVG addresses a gradient by id: one `<defs>` entry, referenced by any number of shapes. The old
 * renderer leaned on that hard — `SkyClouds` minted its defs per *quantised tint* rather than per
 * lobe, collapsing the def count from O(lobes) to the handful of tint families on screen, because
 * radial gradients are the most expensive paint in the scene.
 *
 * Skia has no id table. A gradient is a shader on a paint, and a declarative `<RadialGradient>` child
 * builds a fresh one for the shape it sits in — which would have thrown that optimisation away and
 * minted a shader per cloud per frame. But `DrawingNodeProps` carries a **`paint`** prop, so a paint
 * built once can be handed to as many shapes as like. That is what this file builds, and it is how the
 * per-tint sharing survives the port intact.
 *
 * ── The unit-circle convention ───────────────────────────────────────────────────────────────────
 * A shared paint can only work if every user draws in the same coordinate space, so **every gradient
 * here is centred on (0,0) with radius 1**. The caller draws a unit circle inside a `<Group>` that
 * translates, rotates and scales it into place:
 *
 *   <Group transform={[{translateX: cx}, {translateY: cy}, {rotate: rad}, {scaleX: rx}, {scaleY: ry}]}>
 *     <Circle cx={0} cy={0} r={1} paint={paint} />
 *   </Group>
 *
 * That also gets ellipses and their rotation for free, which SVG expressed as `rx`/`ry` plus a
 * `rotate(deg, cx, cy)` string. **Skia's `rotate` is radians**, unlike SVG's degrees — the one
 * conversion to remember when diffing these files against the web's.
 *
 * ── What is approximated, and where ──────────────────────────────────────────────────────────────
 * The glass bead's body and caustic are *focal* gradients on the web (`fx`/`fy` on
 * `<radialGradient>`), which is what puts the highlight up and to the left of the sphere's centre
 * rather than in the middle of it. Skia's radial gradient has no focal point — the honest equivalent
 * is a two-point conical shader. Here the centre is simply **offset** by the same amount instead,
 * which for ramps this soft is visually indistinguishable and one shader rather than two. The offsets
 * are derived from the web's percentages in `BEAD_FOCAL`, so if the design changes there is one place
 * to follow it.
 */

/** `objectBoundingBox` percentages are fractions of the box; the unit circle's radius is half a box.
 *  So a focal at `fx%` sits `(0.5 - fx) * 2` radii from the centre. */
const focalOffset = (pct: number) => (0.5 - pct) * -2;

/** The web's `fx`/`fy` on the two bead gradients, as unit-circle centre offsets. */
const BEAD_FOCAL = {
  body: { x: focalOffset(0.33), y: focalOffset(0.27) },
  caustic: { x: focalOffset(0.5), y: focalOffset(0.88) },
} as const;

/**
 * A stop's colour and alpha as one `SkColor`. SVG carries them as separate attributes
 * (`stopColor`/`stopOpacity`); a Skia gradient takes premultiplied-by-nothing RGBA, so the two are
 * folded here — which is also why `rgbOf` is imported rather than the hex passed through.
 */
const colorOf = ({ color, alpha }: ColorStop) => {
  const [r, g, b] = rgbOf(color);
  return Skia.Color(`rgba(${r}, ${g}, ${b}, ${alpha})`);
};

/** One radial-gradient paint on the unit circle, from a stop list. */
const radial = (stops: ColorStop[], cx = 0, cy = 0): SkPaint => {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: cx, y: cy },
      1,
      stops.map(colorOf),
      stops.map((s) => s.at),
      TileMode.Clamp,
    ),
  );
  return paint;
};

/** A flat colour fill. Cheaper than a gradient and used wherever the web used a plain `fill`. */
export const solidPaint = (hex: string, alpha = 1): SkPaint => {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const [r, g, b] = rgbOf(hex);
  paint.setColor(Skia.Color(`rgba(${r}, ${g}, ${b}, ${alpha})`));
  return paint;
};

/* ---------- the star layer ---------- */

/**
 * The glow behind a star, one paint per rank — the port of the old `sky-glow-{rank}` defs. Built per
 * *palette*: nothing about the camera touches these, so they outlive every frame.
 *
 * The stops are the web's exactly (0.34 / 0.1 / 0 at 0%, 38%, 100%), stated here rather than in
 * `lib/palette.ts` because that file is the verbatim copy and these three numbers were inline in the
 * renderer on both platforms.
 */
export const glowPaints = (ranks: RankRamp): SkPaint[] =>
  ranks.map((colour) =>
    radial([
      { at: 0, color: colour, alpha: 0.34 },
      { at: 0.38, color: colour, alpha: 0.1 },
      { at: 1, color: colour, alpha: 0 },
    ]),
  );

export type BeadPaints = { body: SkPaint; caustic: SkPaint };

/**
 * The glass bead's two gradients, one pair per rank — the body and the caustic bounce beneath it.
 * **Per rank, never per star**: both are radius-independent on the unit circle, so eight paints cover
 * every beaded star in the sky.
 */
export const beadPaints = (ranks: RankRamp): BeadPaints[] =>
  beadRamps(ranks).map((bead) => ({
    body: radial(bead.body, BEAD_FOCAL.body.x, BEAD_FOCAL.body.y),
    caustic: radial(bead.caustic, BEAD_FOCAL.caustic.x, BEAD_FOCAL.caustic.y),
  }));

/* ---------- the cloud layer ---------- */

/**
 * The cloud paints for one frame's worth of lobes and halos, keyed exactly as the SVG renderer keyed
 * its defs — by **quantised** tint, so two lobes whose tints differ by less than a perceptible step
 * share one shader. This is the whole reason the cloud layer is affordable at the outer view.
 *
 * Returns three maps rather than one so a key collision between families is impossible; the SVG copy
 * namespaced them by id prefix for the same reason.
 */
export type CloudPaints = {
  lobe: Map<string, SkPaint>;
  halo: Map<string, SkPaint>;
  hot: Map<string, SkPaint>;
};

export const cloudPaints = (
  lobes: { tint: GroupTint; hot: unknown; hotW: number }[],
  halos: { lobe: { tint: GroupTint } }[],
  hotCoreMin: number,
): CloudPaints => {
  const lobe = new Map<string, SkPaint>();
  const halo = new Map<string, SkPaint>();
  const hot = new Map<string, SkPaint>();

  for (const l of lobes) {
    const key = tintKey(l.tint);
    if (!lobe.has(key)) lobe.set(key, radial(lobeStops(quantiseTint(l.tint))));
    if (l.hot && l.hotW > hotCoreMin) {
      const hotKey = l.tint.peak;
      if (!hot.has(hotKey)) hot.set(hotKey, radial(hotStops(l.tint.peak)));
    }
  }
  for (const h of halos) {
    const key = quantiseColor(h.lobe.tint.body);
    if (!halo.has(key)) halo.set(key, radial(haloStops(quantiseTint(h.lobe.tint))));
  }
  return { lobe, halo, hot };
};

/** The key a lobe looks its own paint up by. Exported so the renderer cannot key differently from
 *  the builder — the one bug this shape is prone to. */
export const lobeKey = (tint: GroupTint) => tintKey(tint);
export const haloKey = (tint: GroupTint) => quantiseColor(tint.body);
export const hotKey = (tint: GroupTint) => tint.peak;

/* ---------- the wash ---------- */

/** The focused deck's atmosphere: two paints, body and peak, at the wash's own alpha. */
export const washPaints = (tint: GroupTint, alpha: number): { body: SkPaint; peak: SkPaint } => ({
  body: radial(washStops(tint.body, alpha)),
  peak: radial(washStops(tint.peak, alpha)),
});
