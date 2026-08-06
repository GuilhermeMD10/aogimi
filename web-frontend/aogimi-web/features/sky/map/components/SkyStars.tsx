'use client';

import { clip } from '../lib/cards';
import {
  HOVER_HALO_PX,
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
 * One deck's surviving stars, in that deck's own local coordinates.
 *
 * The shape is the load-bearing idea, not the colour: **one signal ring per rank step**, so a reader
 * can count a star's rank without reading its hue — nothing, one ring, two rings, two rings plus an
 * orbit. Colour says the same thing a second time, for readers who can use it. The outgoing
 * vocabulary (`dot · dot · cross · sparkle`) failed at exactly the point this fixes: its first two
 * ranks were the same shape, so the ladder was really only three states deep.
 *
 * **Rank and brightness are two axes, and they answer different questions.** Rank (`s.mastery`) is
 * what the star is drawn *as*, and it is monotonic above Learned — the ladder deliberately refuses
 * to demote a card the reader once knew. Brightness (`s.glow`, the card's retrievability) is how
 * fresh that knowledge is *now*, and it is the only thing a lapse moves. So a mastered word left for
 * a year keeps its orbit and burns low: still an achievement, visibly owed a visit. Everything the
 * star emits takes `lit`; the hover and selection rings deliberately do not, being chrome.
 *
 * Every size here is a **screen px** measurement multiplied by `u`. That is what keeps a star the
 * same size on screen while the world scales underneath it; anything that skips `u` thickens as you
 * zoom, which is the most common way to make a zoomable drawing look wrong.
 */

/**
 * The glass bead — the core, drawn as six layers of lit glass instead of a flat disc.
 *
 * Only ever called above `BEAD_MIN_CORE_PX`, and that gate is the entire reason this is affordable:
 * the bead is specified against a sample strip four times larger than a field star, where its
 * secondary dot would otherwise land at a third of a pixel and its two gradient fills would triple
 * the sky's gradient count. Above the gate there are few enough stars on screen for it to be free.
 *
 * `c` is the core radius in **world units** (already through `u`); stroke widths are screen px and
 * ride `non-scaling-stroke`, like every other stroke in this file. Coordinates are baked absolute
 * rather than wrapped in a `<g transform>` — one fewer node per beaded star.
 */
const bead = (x: number, y: number, c: number, rank: number) => (
  <>
    {/* 1 · the body: white highlight through the rank colour into a shadowed rim */}
    <circle cx={x} cy={y} r={c} fill={`url(#sky-bead-${rank})`} />
    {/* 2 · the caustic bounce off the bottom, which is what reads as glass rather than as a sphere */}
    <circle cx={x} cy={y} r={c * 0.94} fill={`url(#sky-caustic-${rank})`} />
    {/* 3 · rim */}
    <circle
      cx={x}
      cy={y}
      r={c}
      fill="none"
      stroke={BEAD_HIGHLIGHT}
      strokeOpacity={0.6}
      strokeWidth={Math.max(0.7, c * 0.08)}
      vectorEffect="non-scaling-stroke"
    />
    {/* 4 · the arc highlight riding the upper-left shoulder */}
    <path
      d={`M ${x - c * 0.62} ${y - c * 0.5} A ${c * 0.8} ${c * 0.8} 0 0 1 ${x + c * 0.28} ${y - c * 0.76}`}
      fill="none"
      stroke={BEAD_HIGHLIGHT}
      strokeWidth={Math.max(0.7, c * 0.09)}
      strokeLinecap="round"
      opacity={0.85}
      vectorEffect="non-scaling-stroke"
    />
    {/* 5 · specular */}
    <ellipse
      cx={x - c * 0.32}
      cy={y - c * 0.4}
      rx={c * 0.3}
      ry={c * 0.17}
      fill={BEAD_HIGHLIGHT}
      opacity={0.9}
      transform={`rotate(-24 ${x - c * 0.32} ${y - c * 0.4})`}
    />
    {/* 6 · the far-side glint */}
    <circle cx={x + c * 0.38} cy={y + c * 0.3} r={c * 0.09} fill={BEAD_HIGHLIGHT} opacity={0.6} />
  </>
);

type Props = {
  stars: Star[];
  /** The active hue preset's four rank colours. A module const inside SKY_PALETTES, so it is
   *  reference-stable and the DeckLayer memo above survives it. */
  ranks: RankRamp;
  /** Survivors standing in for a collapsed group. Drawn larger, and never dimmed. */
  fulcral: ReadonlySet<number>;
  /** Whether this deck is the focused one. An unfocused deck's stars carry less ink. */
  focused: boolean;
  /** The deck's own star multiplier — `deckPresence().scale`, so the chooser's smallest decks are
   *  drawn large enough to see. 1 at every other size and inside a focused deck. */
  starScale?: number;
  /** ...and the other half of that: a small deck's stars are drawn lit rather than as faint
   *  context, which is what buys them the full core, the specular and the bead. */
  vivid?: boolean;
  /** Zoom relative to this tier's fitted view. Drives the sublinear swell. */
  relZoom: number;
  /** ...and this tier's ceiling in the same currency, which is what the focused deck's size ramp
   *  runs between (FOCUSED_STAR_SCALE → FOCUSED_STAR_PEAK_SCALE). */
  relZoomMax?: number;
  /** World units per screen px. */
  u: number;
  hovered: number | null;
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
  hovered,
  selected,
  labelOp,
}: Props) {
  const labelled = focused && labelOp > 0.01;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {stars.map((s) => {
        const isFulcral = fulcral.has(s.id);
        const isSelected = s.id === selected;
        // a star that neither stands in for a group nor belongs to the deck you are looking at is
        // context rather than content, so it is drawn faint — unless its deck is small enough that
        // this *is* its whole silhouette, which is what `vivid` says (see SMALL_DECK_MAX)
        const dim = !focused && !isFulcral && !vivid;
        const rPx = starRadiusPx(s.mastery, {
          relZoom,
          relZoomMax,
          focused,
          fulcral: isFulcral,
          scale: starScale,
        });
        const r = rPx * u;
        // the gate is read off the *unboosted* core, so hovering a star never swaps which core form
        // it wears — a bead popping in under the cursor would read as a glitch, not as feedback
        const corePx = coreRadius(rPx);
        const cr = corePx * u * (s.id === hovered || isSelected ? 1.22 : 1);
        const colour = starColor(s.mastery, ranks);
        const glow = glowOf(s.mastery);
        const rank = rankOf(s.mastery);
        // How brightly this one burns *right now* — the host's retrievability,
        // floored so a forgotten star never fades to "deleted" (see
        // STAR_MIN_LIT). Multiplied into the star's own light only: the hover
        // and selection rings are chrome, and chrome that dimmed with the card
        // behind it would be unreadable exactly when it is being used.
        const lit = STAR_MIN_LIT + (1 - STAR_MIN_LIT) * clamp01(s.glow);
        // a dim star is context: it keeps the flat core however far in the camera is, which is both
        // honest about its standing and free of nodes exactly where they buy least
        const beaded = !dim && beadResolves(corePx);

        return (
          <g
            key={s.id}
            className={s.seen ? undefined : 'sky-star'}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            {/* 1 · the glow. Deliberately tighter and fainter than the reference's — at 4.6× and
                full strength a field of stars read as a field of halos. */}
            <circle
              cx={s.x}
              cy={s.y}
              r={glowRadius(rPx) * u}
              fill={`url(#sky-glow-${s.mastery})`}
              opacity={(dim ? glow : Math.min(0.55, glow * 2.2)) * lit}
            />

            {/* 2 · the signal rings — the rank glyph. One ripple outward per rank step, so the
                ladder is *countable*: nothing, one, two, and the orbit below for mastered. Radii
                are held inside ORNAMENT_MAX so neighbouring ring systems never overlap; two
                overlapping ring systems read as moiré rather than as two stars. */}
            {ringRadii(rPx, s.mastery).map((ringR, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={ringR * u}
                fill="none"
                stroke={colour}
                strokeOpacity={RING_ALPHA[i] * (dim ? RING_DIM : 1) * lit}
                strokeWidth={ringWidth(rPx)}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* 3 · the mastered rank's orbit and satellite — its fourth state, earned. A shape
                signal, not a motion one: the handover twinkled both of these and that was dropped,
                because an infinite animation per gold star repaints its region every frame with the
                camera parked, and this layer is otherwise wholly static once it has landed.

                Both take the rank's own colour rather than the handover's white. White is spoken
                for here — see SELECT_COLOR — and a white satellite orbiting a star reads as a
                selection marker rather than as part of it. */}
            {hasOrbit(s.mastery) &&
              (() => {
                const o = orbitOf(rPx);
                const alpha = (dim ? RING_DIM : 1) * lit;
                return (
                  <>
                    <ellipse
                      cx={s.x}
                      cy={s.y}
                      rx={o.rx * u}
                      ry={o.ry * u}
                      fill="none"
                      stroke={colour}
                      strokeOpacity={ORBIT_ALPHA * alpha}
                      strokeWidth={o.width}
                      vectorEffect="non-scaling-stroke"
                      transform={`rotate(${o.tilt} ${s.x} ${s.y})`}
                    />
                    <circle
                      cx={s.x + o.satX * u}
                      cy={s.y + o.satY * u}
                      r={o.satR * u}
                      fill={colour}
                      opacity={0.95 * alpha}
                    />
                  </>
                );
              })()}

            {/* 4 · hover ring */}
            {s.id === hovered && !isSelected && (
              <circle
                className="sky-hover"
                cx={s.x}
                cy={s.y}
                r={r + HOVER_HALO_PX * u}
                fill="none"
                stroke={colour}
                strokeOpacity={0.6}
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* 5 · the selected star: a wider ring in the chrome's white, over an amplified glow.
                What ties the open card in the panel to its point of light in the sky. White rather
                than a hue, so it cannot be mistaken for a rank under any preset — see SELECT_COLOR. */}
            {isSelected && (
              <>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={rPx * SELECT_GLOW_SCALE * u}
                  fill={`url(#sky-glow-${s.mastery})`}
                  opacity={0.9}
                />
                <circle
                  className="sky-hover"
                  cx={s.x}
                  cy={s.y}
                  r={r + SELECT_HALO_PX * u}
                  fill="none"
                  stroke={SELECT_COLOR}
                  strokeOpacity={0.95}
                  strokeWidth={1.8}
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}

            {/* 6 · the core, in one of two forms. The bead's six layers of lit glass once there are
                enough pixels for them to resolve; the flat disc the sky has always drawn otherwise.
                Every rank draws a core now — nothing hides one behind a solid body any more. */}
            {beaded ? (
              // The bead is six layers with their own fills, so brightness goes
              // on the group rather than being threaded through each stop.
              <g opacity={lit}>{bead(s.x, s.y, cr, rank)}</g>
            ) : (
              <circle cx={s.x} cy={s.y} r={cr} fill={colour} opacity={(dim ? 0.55 : 1) * lit} />
            )}

            {/* 7 · specular highlight, up and to the left, which is what stops a flat core reading
                as a flat disc. The bead carries its own, so this is the fallback's alone. Off for
                the faintest stars, where it would be the brightest thing about them — and off below
                ~1.2px of core, where it cannot be seen but would still cost a DOM node per star
                exactly where stars are most numerous. */}
            {!beaded && !dim && cr / u >= 1.2 && (
              <circle
                cx={s.x - cr * 0.22}
                cy={s.y - cr * 0.22}
                r={cr * 0.4}
                fill="white"
                opacity={(rank >= 2 ? 0.65 : 0.45) * lit}
              />
            )}

            {/* 8 · the front text, right and slightly below, once the zoom has bought it room.
                Clipped hard — the label is a glance and the panel holds the whole card. Sized and
                offset in screen px like every stroke here, so it neither balloons nor vanishes
                with the world scale. */}
            {labelled && (
              <text
                x={s.x + r + LABEL_OFFSET_X_PX * u}
                y={s.y + LABEL_OFFSET_Y_PX * u}
                fontSize={LABEL_FONT_PX * u}
                fontWeight={LABEL_FONT_WEIGHT}
                fill={STAR_LABEL_COLOR}
                fillOpacity={(isSelected ? 1 : 0.85) * labelOp}
              >
                {clip(s.front, LABEL_MAX_CHARS)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
