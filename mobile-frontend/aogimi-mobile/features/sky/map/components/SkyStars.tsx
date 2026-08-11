import { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

import { clip } from '../lib/cards';
import {
  LABEL_FONT_PX,
  LABEL_FONT_WEIGHT,
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

/**
 * One deck's surviving stars, in that deck's own local coordinates — the native port of the web's
 * `SkyStars.tsx`. Read that file for the design: **one signal ring per rank step**, so a reader can
 * count a star's rank without reading its hue; and rank vs brightness as two axes, where rank is
 * monotonic above Learned and brightness is the only thing a lapse moves.
 *
 * Every size here is a **screen px** measurement multiplied by `u`, which is what keeps a star the
 * same size on screen while the world scales underneath it.
 *
 * ── Two deliberate departures from the web copy ──────────────────────────────────────────────────
 *
 * **1 · Strokes are `* u` instead of `vectorEffect="non-scaling-stroke"`.** The two are the same
 * arithmetic: `u` is world-units-per-screen-px, so a stroke of `N * u` world units renders at exactly
 * N device px, which is what non-scaling-stroke asks the renderer to do. Doing it in the numbers
 * rather than in a paint flag means the width cannot depend on whether Fabric honours that attribute,
 * and it is verifiable by reading the file. Every stroke the web tags is multiplied here; the tag is
 * not used at all.
 *
 * **2 · No entry animations.** `.sky-star`'s pop, `.sky-hover`'s fade and the rest are CSS keyframes
 * with no `react-native-svg` equivalent, and per-star Reanimated nodes are not a trade worth making
 * on the layer that can hold hundreds of them. The web disables all of them under
 * `prefers-reduced-motion`, so this is a supported state of the design rather than a gap in it.
 *
 * There is also no `hovered` prop: a touch screen has no cursor, so the web's hover ring and its
 * name-under-the-cursor readout have nothing to key on. Selection does that job here, and it is
 * driven by a tap.
 */

/**
 * The glass bead — the core, drawn as six layers of lit glass instead of a flat disc.
 *
 * Only ever called above `BEAD_MIN_CORE_PX`, and that gate is the entire reason it is affordable.
 * `c` is the core radius in **world units** (already through `u`); stroke widths were screen px on
 * the web and are `* u` here, so `u` is threaded in.
 */
const bead = (x: number, y: number, c: number, rank: number, u: number) => (
  <>
    {/* 1 · the body: white highlight through the rank colour into a shadowed rim */}
    <Circle cx={x} cy={y} r={c} fill={`url(#sky-bead-${rank})`} />
    {/* 2 · the caustic bounce off the bottom, which is what reads as glass rather than as a sphere */}
    <Circle cx={x} cy={y} r={c * 0.94} fill={`url(#sky-caustic-${rank})`} />
    {/* 3 · rim */}
    <Circle
      cx={x}
      cy={y}
      r={c}
      fill="none"
      stroke={BEAD_HIGHLIGHT}
      strokeOpacity={0.6}
      strokeWidth={Math.max(0.7, c * 0.08) * u}
    />
    {/* 4 · the arc highlight riding the upper-left shoulder */}
    <Path
      d={`M ${x - c * 0.62} ${y - c * 0.5} A ${c * 0.8} ${c * 0.8} 0 0 1 ${x + c * 0.28} ${y - c * 0.76}`}
      fill="none"
      stroke={BEAD_HIGHLIGHT}
      strokeWidth={Math.max(0.7, c * 0.09) * u}
      strokeLinecap="round"
      opacity={0.85}
    />
    {/* 5 · specular */}
    <Ellipse
      cx={x - c * 0.32}
      cy={y - c * 0.4}
      rx={c * 0.3}
      ry={c * 0.17}
      fill={BEAD_HIGHLIGHT}
      opacity={0.9}
      transform={`rotate(-24, ${x - c * 0.32}, ${y - c * 0.4})`}
    />
    {/* 6 · the far-side glint */}
    <Circle cx={x + c * 0.38} cy={y + c * 0.3} r={c * 0.09} fill={BEAD_HIGHLIGHT} opacity={0.6} />
  </>
);

type Props = {
  stars: Star[];
  /** The active hue preset's four rank colours. Reference-stable inside SKY_PALETTES, so the
   *  DeckLayer memo survives it. */
  ranks: RankRamp;
  /** Survivors standing in for a collapsed group. Drawn larger, and never dimmed. */
  fulcral: ReadonlySet<number>;
  /** Whether this deck is the focused one. An unfocused deck's stars carry less ink. */
  focused: boolean;
  /** The deck's own star multiplier — `deckPresence().scale`. 1 inside a focused deck. */
  starScale?: number;
  /** ...and the other half of that: a small deck's stars are drawn lit rather than as faint
   *  context, which is what buys them the full core, the specular and the bead. */
  vivid?: boolean;
  /** Zoom relative to this tier's fitted view. Drives the sublinear swell. */
  relZoom: number;
  /** ...and this tier's ceiling in the same currency. */
  relZoomMax?: number;
  /** World units per screen px. */
  u: number;
  /** The open card's star: ringed and its glow amplified, so the panel and the sky agree. */
  selected: number | null;
  /** How strongly the front-text labels are faded up — `labelOpAt(zoom)`, 0 outside a focused deck. */
  labelOp: number;
};

export function SkyStars({
  stars,
  ranks,
  fulcral,
  focused,
  starScale = 1,
  vivid = false,
  relZoom,
  relZoomMax,
  u,
  selected,
  labelOp,
}: Props) {
  const labelled = focused && labelOp > 0.01;
  return (
    <G pointerEvents="none">
      {stars.map((s) => {
        const isFulcral = fulcral.has(s.id);
        const isSelected = s.id === selected;
        // a star that neither stands in for a group nor belongs to the deck you are looking at is
        // context rather than content, so it is drawn faint — unless its deck is small enough that
        // this *is* its whole silhouette, which is what `vivid` says
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
        // How brightly this one burns *right now* — the host's retrievability, floored so a
        // forgotten star never fades to "deleted". Multiplied into the star's own light only: the
        // selection ring is chrome, and chrome that dimmed with the card behind it would be
        // unreadable exactly when it is being used.
        const lit = STAR_MIN_LIT + (1 - STAR_MIN_LIT) * clamp01(s.glow);
        // a dim star is context: it keeps the flat core however far in the camera is, which is both
        // honest about its standing and free of nodes exactly where they buy least
        const beaded = !dim && beadResolves(corePx);

        return (
          <G key={s.id}>
            {/* 1 · the glow. Deliberately tighter and fainter than the reference's — at 4.6× and
                full strength a field of stars read as a field of halos. */}
            <Circle
              cx={s.x}
              cy={s.y}
              r={glowRadius(rPx) * u}
              fill={`url(#sky-glow-${s.mastery})`}
              opacity={(dim ? glow : Math.min(0.55, glow * 2.2)) * lit}
            />

            {/* 2 · the signal rings — the rank glyph. One ripple outward per rank step, so the
                ladder is *countable*: nothing, one, two, and the orbit below for mastered. */}
            {ringRadii(rPx, s.mastery).map((ringR, i) => (
              <Circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={ringR * u}
                fill="none"
                stroke={colour}
                strokeOpacity={RING_ALPHA[i] * (dim ? RING_DIM : 1) * lit}
                strokeWidth={ringWidth(rPx) * u}
              />
            ))}

            {/* 3 · the mastered rank's orbit and satellite — its fourth state, earned. A shape
                signal, not a motion one. Both take the rank's own colour rather than white, which
                is spoken for by SELECT_COLOR. */}
            {hasOrbit(s.mastery) &&
              (() => {
                const o = orbitOf(rPx);
                const alpha = (dim ? RING_DIM : 1) * lit;
                return (
                  <>
                    <Ellipse
                      cx={s.x}
                      cy={s.y}
                      rx={o.rx * u}
                      ry={o.ry * u}
                      fill="none"
                      stroke={colour}
                      strokeOpacity={ORBIT_ALPHA * alpha}
                      strokeWidth={o.width * u}
                      transform={`rotate(${o.tilt}, ${s.x}, ${s.y})`}
                    />
                    <Circle
                      cx={s.x + o.satX * u}
                      cy={s.y + o.satY * u}
                      r={o.satR * u}
                      fill={colour}
                      opacity={0.95 * alpha}
                    />
                  </>
                );
              })()}

            {/* 4 · the selected star: a wider ring in the chrome's white, over an amplified glow.
                What ties the open card in the panel to its point of light in the sky. (The web's
                hover ring has no native counterpart — see the header.) */}
            {isSelected && (
              <>
                <Circle
                  cx={s.x}
                  cy={s.y}
                  r={rPx * SELECT_GLOW_SCALE * u}
                  fill={`url(#sky-glow-${s.mastery})`}
                  opacity={0.9}
                />
                <Circle
                  cx={s.x}
                  cy={s.y}
                  r={r + SELECT_HALO_PX * u}
                  fill="none"
                  stroke={SELECT_COLOR}
                  strokeOpacity={0.95}
                  strokeWidth={1.8 * u}
                />
              </>
            )}

            {/* 5 · the core, in one of two forms: the bead's six layers of lit glass once there are
                enough pixels for them to resolve, the flat disc otherwise. */}
            {beaded ? (
              <G opacity={lit}>{bead(s.x, s.y, cr, rank, u)}</G>
            ) : (
              <Circle cx={s.x} cy={s.y} r={cr} fill={colour} opacity={(dim ? 0.55 : 1) * lit} />
            )}

            {/* 6 · specular highlight, up and to the left, which is what stops a flat core reading
                as a flat disc. Off below ~1.2px of core, where it cannot be seen but would still
                cost a node per star exactly where stars are most numerous. */}
            {!beaded && !dim && cr / u >= 1.2 && (
              <Circle
                cx={s.x - cr * 0.22}
                cy={s.y - cr * 0.22}
                r={cr * 0.4}
                fill="white"
                opacity={(rank >= 2 ? 0.65 : 0.45) * lit}
              />
            )}

            {/* 7 · the front text, right and slightly below, once the zoom has bought it room.
                Clipped hard — the label is a glance and the card detail lives in the host's chrome. */}
            {labelled && (
              <SvgText
                x={s.x + r + LABEL_OFFSET_X_PX * u}
                y={s.y + LABEL_OFFSET_Y_PX * u}
                fontSize={LABEL_FONT_PX * u}
                fontWeight={LABEL_FONT_WEIGHT}
                fill={STAR_LABEL_COLOR}
                fillOpacity={(isSelected ? 1 : 0.85) * labelOp}
              >
                {clip(s.front, LABEL_MAX_CHARS)}
              </SvgText>
            )}
          </G>
        );
      })}
    </G>
  );
}
