import { useMemo } from 'react';
import { Circle, Group, Path, Skia, Text, type SkFont } from '@shopify/react-native-skia';

import { clip } from '../lib/cards';
import {
  LABEL_FONT_PX,
  LABEL_MAX_CHARS,
  LABEL_OFFSET_X_PX,
  LABEL_OFFSET_Y_PX,
  ORBIT_ALPHA,
  RING_ALPHA,
  RING_DIM,
  SELECT_GLOW_SCALE,
  SELECT_HALO_PX,
  STAR_MIN_LIT,
} from '../lib/config';
import { clamp01 } from '../lib/geometry';
import {
  BEAD_HIGHLIGHT,
  SELECT_COLOR,
  STAR_LABEL_COLOR,
  type RankRamp,
  rankOf,
  starColor,
} from '../lib/palette';
import {
  beadResolves,
  coreRadius,
  glowOf,
  glowRadius,
  hasOrbit,
  orbitOf,
  ringRadii,
  ringWidth,
  starRadiusPx,
} from '../lib/star';
import type { Star } from '../lib/types';

import { type BeadPaints } from './SkyPaints';

/**
 * One deck's surviving stars, in that deck's own local coordinates. Read the web copy for the design:
 * **one signal ring per rank step**, so a reader can count a star's rank without reading its hue; and
 * rank vs brightness as two axes, where rank is monotonic above Learned and brightness is the only
 * thing a lapse moves.
 *
 * Every size here is a **screen px** measurement multiplied by `u`, which is what keeps a star the
 * same size on screen while the world scales underneath it. `u` comes from the *committed* camera, so
 * between commits a pinch scales these with the matrix and each commit snaps them back — see
 * `hooks/useSkyCamera.ts` for why that trade is the design and `COMMIT_ZOOM_RATIO` for the knob.
 *
 * `SkyWash.tsx`'s header states the four SVG→Skia translation rules. Two more apply only here:
 *
 * **Strokes stay `* u`, not `vectorEffect="non-scaling-stroke"`.** Same arithmetic — `u` is
 * world-units-per-screen-px, so a stroke of `N * u` world units renders at exactly N device px. Doing
 * it in the numbers means the width cannot depend on whether the renderer honours a paint flag, and it
 * is verifiable by reading the file. Skia has no such flag anyway.
 *
 * **No entry animations.** The web's `.sky-star` pop and `.sky-hover` fade are CSS keyframes. The web
 * disables all of them under `prefers-reduced-motion`, so a still sky is a supported state of the
 * design rather than a gap in it. There is also no `hovered` prop: a touch screen has no cursor, so
 * selection does that job and it is driven by a tap.
 */

/**
 * The glass bead — the core, drawn as six layers of lit glass instead of a flat disc.
 *
 * Only ever called above `BEAD_MIN_CORE_PX`, and that gate is the entire reason it is affordable. `c`
 * is the core radius in **world units** (already through `u`); stroke widths were screen px on the web
 * and are `* u` here, so `u` is threaded in.
 *
 * The two gradients arrive as shared per-rank paints on the unit circle, so each is drawn as a scaled
 * group rather than a positioned ellipse — see `SkyPaints.ts`.
 */
const Bead = ({
  x,
  y,
  c,
  u,
  paints,
}: {
  x: number;
  y: number;
  c: number;
  u: number;
  paints: BeadPaints;
}) => {
  // The arc riding the upper-left shoulder. A Path rather than a stroked arc string, built here
  // because Skia takes a path object rather than SVG's `d`.
  const shoulder = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(-c * 0.62, -c * 0.5);
    // The web's `A rx ry 0 0 1 …` sweep, as an arc to the same end point.
    p.arcToRotated(c * 0.8, c * 0.8, 0, false, true, c * 0.28, -c * 0.76);
    return p;
  }, [c]);

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {/* 1 · the body: white highlight through the rank colour into a shadowed rim */}
      <Group transform={[{ scaleX: c }, { scaleY: c }]}>
        <Circle cx={0} cy={0} r={1} paint={paints.body} />
      </Group>
      {/* 2 · the caustic bounce off the bottom, which is what reads as glass rather than a sphere */}
      <Group transform={[{ scaleX: c * 0.94 }, { scaleY: c * 0.94 }]}>
        <Circle cx={0} cy={0} r={1} paint={paints.caustic} />
      </Group>
      {/* 3 · rim */}
      <Circle
        cx={0}
        cy={0}
        r={c}
        color={BEAD_HIGHLIGHT}
        style="stroke"
        strokeWidth={Math.max(0.7, c * 0.08) * u}
        opacity={0.6}
      />
      {/* 4 · the arc highlight */}
      <Path
        path={shoulder}
        color={BEAD_HIGHLIGHT}
        style="stroke"
        strokeWidth={Math.max(0.7, c * 0.09) * u}
        strokeCap="round"
        opacity={0.85}
      />
      {/* 5 · specular — an ellipse, so the unit circle in a scaled, rotated group */}
      <Group
        opacity={0.9}
        transform={[
          { translateX: -c * 0.32 },
          { translateY: -c * 0.4 },
          { rotate: (-24 * Math.PI) / 180 },
          { scaleX: c * 0.3 },
          { scaleY: c * 0.17 },
        ]}
      >
        <Circle cx={0} cy={0} r={1} color={BEAD_HIGHLIGHT} />
      </Group>
      {/* 6 · the far-side glint */}
      <Circle cx={c * 0.38} cy={c * 0.3} r={c * 0.09} color={BEAD_HIGHLIGHT} opacity={0.6} />
    </Group>
  );
};

type Props = {
  stars: Star[];
  /** The active hue preset's four rank colours. */
  ranks: RankRamp;
  /** Per-rank glow paints, built once per palette by the canvas. */
  glowPaints: readonly ReturnType<typeof Skia.Paint>[];
  /** Per-rank bead paint pairs, likewise. */
  beadPaints: readonly BeadPaints[];
  /** Survivors standing in for a collapsed group. Drawn larger, and never dimmed. */
  fulcral: ReadonlySet<number>;
  /** Whether this deck is the focused one. An unfocused deck's stars carry less ink. */
  focused: boolean;
  /** The deck's own star multiplier — `deckPresence().scale`. 1 inside a focused deck. */
  starScale?: number;
  /** ...and the other half of that: a small deck's stars are drawn lit rather than as faint context,
   *  which is what buys them the full core, the specular and the bead. */
  vivid?: boolean;
  /** Zoom relative to this tier's fitted view. Drives the sublinear swell. */
  relZoom: number;
  relZoomMax?: number;
  /** World units per screen px, from the committed camera. */
  u: number;
  /** The open card's star: ringed and its glow amplified, so the panel and the sky agree. */
  selected: number | null;
  /** How strongly the front-text labels are faded up — `labelOpAt(zoom)`, 0 outside a focused deck. */
  labelOp: number;
  /** The label face. Null until it loads, in which case labels are simply not drawn. */
  font: SkFont | null;
};

export function SkyStars({
  stars,
  ranks,
  glowPaints,
  beadPaints,
  fulcral,
  focused,
  starScale = 1,
  vivid = false,
  relZoom,
  relZoomMax,
  u,
  selected,
  labelOp,
  font,
}: Props) {
  const labelled = focused && labelOp > 0.01 && font !== null;

  return (
    <Group>
      {stars.map((s) => {
        const isFulcral = fulcral.has(s.id);
        const isSelected = s.id === selected;
        // A star that neither stands in for a group nor belongs to the deck you are looking at is
        // context rather than content, so it is drawn faint — unless its deck is small enough that
        // this *is* its whole silhouette, which is what `vivid` says.
        const dim = !focused && !isFulcral && !vivid;
        const rPx = starRadiusPx(s.mastery, {
          relZoom,
          relZoomMax,
          focused,
          fulcral: isFulcral,
          scale: starScale,
        });
        const r = rPx * u;
        const corePx = coreRadius(rPx);
        const cr = corePx * u * (isSelected ? 1.22 : 1);
        const colour = starColor(s.mastery, ranks);
        const glow = glowOf(s.mastery);
        const rank = rankOf(s.mastery);
        // How brightly this one burns *right now* — the host's retrievability, floored so a forgotten
        // star never fades to "deleted". Multiplied into the star's own light only: the selection ring
        // is chrome, and chrome that dimmed with the card behind it would be unreadable exactly when
        // it is being used.
        const lit = STAR_MIN_LIT + (1 - STAR_MIN_LIT) * clamp01(s.glow);
        // A dim star is context: it keeps the flat core however far in the camera is, which is both
        // honest about its standing and free of nodes exactly where they buy least.
        const beaded = !dim && beadResolves(corePx);
        const glowR = glowRadius(rPx) * u;
        const orbit = hasOrbit(s.mastery) ? orbitOf(rPx) : null;

        return (
          <Group key={s.id}>
            {/* 1 · the glow. Deliberately tighter and fainter than the reference's — at 4.6× and full
                strength a field of stars read as a field of halos. */}
            <Group
              opacity={(dim ? glow : Math.min(0.55, glow * 2.2)) * lit}
              transform={[
                { translateX: s.x },
                { translateY: s.y },
                { scaleX: glowR },
                { scaleY: glowR },
              ]}
            >
              <Circle cx={0} cy={0} r={1} paint={glowPaints[rank]} />
            </Group>

            {/* 2 · the signal rings — the rank glyph. One ripple outward per rank step, so the ladder
                is *countable*: nothing, one, two, and the orbit below for mastered. */}
            {ringRadii(rPx, s.mastery).map((ringR, i) => (
              <Circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={ringR * u}
                color={colour}
                style="stroke"
                strokeWidth={ringWidth(rPx) * u}
                opacity={RING_ALPHA[i] * (dim ? RING_DIM : 1) * lit}
              />
            ))}

            {/* 3 · the mastered rank's orbit and satellite — its fourth state, earned. A shape signal,
                not a motion one. Both take the rank's own colour rather than white, which is spoken
                for by SELECT_COLOR. The satellite's seat arrives already rotated, so it is a plain
                circle at baked coordinates. */}
            {orbit && (
              <Group opacity={(dim ? RING_DIM : 1) * lit}>
                <Group
                  transform={[
                    { translateX: s.x },
                    { translateY: s.y },
                    { rotate: (orbit.tilt * Math.PI) / 180 },
                    { scaleX: orbit.rx * u },
                    { scaleY: orbit.ry * u },
                  ]}
                >
                  {/* The stroke is inside a scaled group, so its width has to be divided back out —
                      the group's scale would otherwise multiply it by the orbit's radius. */}
                  <Circle
                    cx={0}
                    cy={0}
                    r={1}
                    color={colour}
                    style="stroke"
                    strokeWidth={(orbit.width * u) / (orbit.rx * u)}
                    opacity={ORBIT_ALPHA}
                  />
                </Group>
                <Circle
                  cx={s.x + orbit.satX * u}
                  cy={s.y + orbit.satY * u}
                  r={orbit.satR * u}
                  color={colour}
                  opacity={0.95}
                />
              </Group>
            )}

            {/* 4 · the selected star: a wider ring in the chrome's white, over an amplified glow.
                What ties the open card in the panel to its point of light in the sky. */}
            {isSelected && (
              <Group>
                <Group
                  opacity={0.9}
                  transform={[
                    { translateX: s.x },
                    { translateY: s.y },
                    { scaleX: rPx * SELECT_GLOW_SCALE * u },
                    { scaleY: rPx * SELECT_GLOW_SCALE * u },
                  ]}
                >
                  <Circle cx={0} cy={0} r={1} paint={glowPaints[rank]} />
                </Group>
                <Circle
                  cx={s.x}
                  cy={s.y}
                  r={r + SELECT_HALO_PX * u}
                  color={SELECT_COLOR}
                  style="stroke"
                  strokeWidth={1.8 * u}
                  opacity={0.95}
                />
              </Group>
            )}

            {/* 5 · the core, in one of two forms: the bead's six layers of lit glass once there are
                enough pixels for them to resolve, the flat disc otherwise. */}
            {beaded ? (
              <Group opacity={lit}>
                <Bead x={s.x} y={s.y} c={cr} u={u} paints={beadPaints[rank]} />
              </Group>
            ) : (
              <Circle cx={s.x} cy={s.y} r={cr} color={colour} opacity={(dim ? 0.55 : 1) * lit} />
            )}

            {/* 6 · specular highlight, up and to the left, which is what stops a flat core reading as
                a flat disc. Off below ~1.2px of core, where it cannot be seen but would still cost a
                node per star exactly where stars are most numerous. */}
            {!beaded && !dim && cr / u >= 1.2 && (
              <Circle
                cx={s.x - cr * 0.22}
                cy={s.y - cr * 0.22}
                r={cr * 0.4}
                color="white"
                opacity={(rank >= 2 ? 0.65 : 0.45) * lit}
              />
            )}

            {/* 7 · the front text, right and slightly below, once the zoom has bought it room.
                Clipped hard — the label is a glance and the card detail lives in the host's chrome.
                Skia sizes text through the font object, not a prop, so the canvas hands down a font
                already built at LABEL_FONT_PX and the group scales it by `u`. */}
            {labelled && (
              <Group
                opacity={(isSelected ? 1 : 0.85) * labelOp}
                transform={[
                  { translateX: s.x + r + LABEL_OFFSET_X_PX * u },
                  { translateY: s.y + LABEL_OFFSET_Y_PX * u },
                  { scaleX: u },
                  { scaleY: u },
                ]}
              >
                <Text x={0} y={0} text={clip(s.front, LABEL_MAX_CHARS)} font={font} color={STAR_LABEL_COLOR} />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
}

/** The size the label font must be built at. The renderer scales it by `u`, so the font itself is
 *  created once at the design size rather than rebuilt per zoom — a Skia font is a real object and
 *  re-making one per frame is the mistake this constant exists to prevent. */
export const LABEL_FONT_SIZE = LABEL_FONT_PX;
