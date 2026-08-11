import { Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';

import type { Lobe } from '../lib/cluster';
import { WASH_ALPHA, WASH_LOBES, WASH_MIN_SPREAD } from '../lib/config';
import { washStops } from '../lib/palette';

/**
 * The atmosphere under a focused deck's drawing — the native port of the web's `SkyWash.tsx`.
 *
 * See the web copy for what it is and why it is three overlapping tints sized off the deck's own
 * spread rather than one. The one thing to preserve if this is ever touched: **it answers to no zoom
 * threshold.** Every other soft layer exists because stars could not be drawn and so leaves as they
 * arrive; this one is the sky the drawing sits on.
 *
 * ── The three translation rules used by every component in this folder ───────────────────────────
 *  1. `<g>/<ellipse>/<defs>/<radialGradient>/<stop>` → the `react-native-svg` components. Prop names
 *     are unchanged, which is what keeps these files diffable against the web's.
 *  2. `style={{ pointerEvents: 'none' }}` → the `pointerEvents` **prop**. Picking runs against
 *     coordinates in SkyCanvas's gesture handlers, so every paint layer is inert.
 *  3. SVG `transform` strings are passed through — `react-native-svg`'s `transform` prop accepts a
 *     string — with **commas** between arguments rather than the web's spaces, which its parser
 *     handles unambiguously.
 */
export function SkyWash({ root, scope }: { root: Lobe; scope: string }) {
  const bodyId = `sky-wash-${scope}-b`;
  const peakId = `sky-wash-${scope}-p`;
  // the y axis carries the root's aspect, so the wash lies along the same principal axis its lobes
  // and halos do — an unrotated circular wash under an elongated deck reads as a spotlight
  const spread = Math.max(root.sd, WASH_MIN_SPREAD);
  const aspect = root.aspect;

  return (
    <G pointerEvents="none" transform={`rotate(${root.angle}, ${root.cx}, ${root.cy})`}>
      <Defs>
        <RadialGradient id={bodyId}>
          {washStops(root.tint.body, WASH_ALPHA).map(({ at, color, alpha }) => (
            <Stop key={at} offset={at} stopColor={color} stopOpacity={alpha} />
          ))}
        </RadialGradient>
        <RadialGradient id={peakId}>
          {washStops(root.tint.peak, WASH_ALPHA).map(({ at, color, alpha }) => (
            <Stop key={at} offset={at} stopColor={color} stopOpacity={alpha} />
          ))}
        </RadialGradient>
      </Defs>

      {WASH_LOBES.map((w, i) => (
        <Ellipse
          key={i}
          cx={root.cx + w.dx * spread}
          cy={root.cy + w.dy * spread * aspect}
          rx={w.rx * spread}
          ry={w.rx * spread * aspect}
          fill={`url(#${w.peak ? peakId : bodyId})`}
          opacity={w.alpha}
        />
      ))}
    </G>
  );
}
