'use client';

import {
  type Lobe,
  lobeTint,
  WASH_ALPHA,
  WASH_LOBES,
  WASH_MIN_SPREAD,
  type RankRamp,
  washStops,
} from '../lib';

/**
 * The atmosphere under a focused deck's drawing: three broad, overlapping tints sized off the deck's
 * own spread. See WASH_LOBES for why it is three rather than one, why it is `sd`-based rather than
 * bbox-based, and why it is not part of the cloud layer.
 *
 * The one thing to preserve if this is ever touched: **it answers to no zoom threshold.** Every other
 * soft layer in the sky exists because stars could not be drawn and therefore leaves as they arrive;
 * this one is the sky the drawing sits on, and the reader is closest to it exactly when the rest of
 * the atmosphere has gone.
 *
 * World units throughout, so the wash scales with the camera like the stars' positions do — it is the
 * sky, not chrome over it. Inert, like every other painted layer: picking runs against coordinates in
 * the canvas's own handlers.
 */
export function SkyWash({ root, ranks, scope }: { root: Lobe; ranks: RankRamp; scope: string }) {
  const bodyId = `sky-wash-${scope}-b`;
  const peakId = `sky-wash-${scope}-p`;
  const tint = lobeTint(root, ranks);
  // the y axis carries the root's aspect, so the wash lies along the same principal axis its lobes
  // and halos do — an unrotated circular wash under an elongated deck reads as a spotlight
  const spread = Math.max(root.sd, WASH_MIN_SPREAD);
  const aspect = root.aspect;

  return (
    <g style={{ pointerEvents: 'none' }} transform={`rotate(${root.angle} ${root.cx} ${root.cy})`}>
      <defs>
        <radialGradient id={bodyId}>
          {washStops(tint.body, WASH_ALPHA).map(({ at, color, alpha }) => (
            <stop key={at} offset={at} stopColor={color} stopOpacity={alpha} />
          ))}
        </radialGradient>
        <radialGradient id={peakId}>
          {washStops(tint.peak, WASH_ALPHA).map(({ at, color, alpha }) => (
            <stop key={at} offset={at} stopColor={color} stopOpacity={alpha} />
          ))}
        </radialGradient>
      </defs>

      {WASH_LOBES.map((w, i) => (
        <ellipse
          key={i}
          cx={root.cx + w.dx * spread}
          cy={root.cy + w.dy * spread * aspect}
          rx={w.rx * spread}
          ry={w.rx * spread * aspect}
          fill={`url(#${w.peak ? peakId : bodyId})`}
          opacity={w.alpha}
        />
      ))}
    </g>
  );
}
