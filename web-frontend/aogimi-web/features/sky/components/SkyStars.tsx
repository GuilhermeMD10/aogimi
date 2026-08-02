'use client';

import { clip } from '../lib/cards';
import {
  HOVER_HALO_PX,
  LABEL_FONT_PX,
  LABEL_MAX_CHARS,
  LABEL_OFFSET_X_PX,
  LABEL_OFFSET_Y_PX,
  SELECT_GLOW_SCALE,
  SELECT_HALO_PX,
} from '../lib/config';
import { SELECT_COLOR, STAR_LABEL_COLOR, starColor } from '../lib/palette';
import {
  CROSS_ARMS,
  coreRadius,
  crossArm,
  glowOf,
  glowRadius,
  silhouetteOf,
  sparkleOf,
  sparklePath,
  starRadiusPx,
} from '../lib/star';
import type { Star } from '../lib/types';

/**
 * One deck's surviving stars, in that deck's own local coordinates.
 *
 * The silhouette is the load-bearing idea, not the colour (guide §2): a bare dot for the two low
 * ranks, a crossed dot for learned, the single four-point sparkle for mastered — so a reader can
 * tell a star's rank by shape alone. Colour says the same thing a second time, for readers who
 * can use it.
 *
 * Every size here is a **screen px** measurement multiplied by `u`. That is what keeps a star the
 * same size on screen while the world scales underneath it; anything that skips `u` thickens as you
 * zoom, which is the most common way to make a zoomable drawing look wrong.
 */

type Props = {
  stars: Star[];
  /** Survivors standing in for a collapsed group. Drawn larger, and never dimmed. */
  fulcral: ReadonlySet<number>;
  /** Whether this deck is the focused one. An unfocused deck's stars carry less ink. */
  focused: boolean;
  /** Zoom relative to this tier's fitted view. Drives the sublinear swell. */
  relZoom: number;
  /** World units per screen px. */
  u: number;
  hovered: number | null;
  /** The open card's star: ringed and its glow amplified, so the panel and the sky agree. */
  selected: number | null;
  /** How strongly the front-text labels are faded up — `labelOpAt(zoom)`, 0 outside a focused deck. */
  labelOp: number;
};

export function SkyStars({ stars, fulcral, focused, relZoom, u, hovered, selected, labelOp }: Props) {
  const labelled = focused && labelOp > 0.01;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {stars.map((s) => {
        const isFulcral = fulcral.has(s.id);
        const isSelected = s.id === selected;
        // a star that neither stands in for a group nor belongs to the deck you are looking at is
        // context rather than content, so it is drawn faint
        const dim = !focused && !isFulcral;
        const rPx = starRadiusPx(s.mastery, { relZoom, focused, fulcral: isFulcral });
        const form = silhouetteOf(s.mastery);
        const r = rPx * u;
        const cr = coreRadius(rPx, form) * u * (s.id === hovered || isSelected ? 1.22 : 1);
        const colour = starColor(s.mastery);
        const glow = glowOf(s.mastery);

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
              opacity={dim ? glow : Math.min(0.55, glow * 2.2)}
            />

            {/* 2 · the mastered rank's four-point sparkle — the star's own body, not a decoration
                on one: dot-sized mass with points, at exactly the ink a core carries. It stands in
                for the core beneath it. */}
            {form === 'sparkle' &&
              (() => {
                const { arm, waist } = sparkleOf(rPx);
                return (
                  <path
                    d={sparklePath(arm * u, arm * u, waist * u)}
                    fill={colour}
                    opacity={dim ? 0.55 : 1}
                    transform={`translate(${s.x} ${s.y})`}
                  />
                );
              })()}

            {/* 3 · the four-armed cross of the learned rank */}
            {form === 'cross' &&
              CROSS_ARMS.map(([ax, ay]) => {
                const { inner, outer } = crossArm(rPx);
                return (
                  <line
                    key={`${ax},${ay}`}
                    x1={s.x + ax * inner * u}
                    y1={s.y + ay * inner * u}
                    x2={s.x + ax * outer * u}
                    y2={s.y + ay * outer * u}
                    stroke={colour}
                    strokeOpacity={dim ? 0.34 : 0.72}
                    strokeWidth={Math.max(0.6, rPx * 0.135)}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

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

            {/* 5 · the selected star: a wider ring in the chrome's gold, over an amplified glow.
                What ties the open card in the panel to its point of light in the sky. */}
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

            {/* 6 · the core. Skipped for the sparkle, whose solid body would hide it entirely —
                drawing the same colour underneath would only cost a node per gold star. */}
            {form !== 'sparkle' && <circle cx={s.x} cy={s.y} r={cr} fill={colour} opacity={dim ? 0.55 : 1} />}

            {/* 7 · specular highlight, up and to the left, which is what stops the core reading as
                a flat disc. Off for the faintest stars, where it would be the brightest thing about
                them — and off below ~1.2px of core, where it cannot be seen but would still cost a
                DOM node per star exactly where stars are most numerous. */}
            {!dim && cr / u >= 1.2 && (
              <circle
                cx={s.x - cr * 0.22}
                cy={s.y - cr * 0.22}
                r={cr * 0.4}
                fill="white"
                opacity={form === 'dot' ? 0.45 : 0.65}
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
