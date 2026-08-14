import { useMemo } from 'react';
import { Circle, Group } from '@shopify/react-native-skia';

import type { Lobe } from '../lib/cluster';
import { WASH_ALPHA, WASH_LOBES, WASH_MIN_SPREAD } from '../lib/config';

import { washPaints } from './SkyPaints';

/**
 * The atmosphere under a focused deck's drawing — the Skia port of the SVG renderer of the same name.
 *
 * See the web copy for what it is and why it is three overlapping tints sized off the deck's own
 * spread rather than one. The one thing to preserve if this is ever touched: **it answers to no zoom
 * threshold.** Every other soft layer exists because stars could not be drawn and so leaves as they
 * arrive; this one is the sky the drawing sits on.
 *
 * ── The four translation rules used by every component in this folder ────────────────────────────
 *  1. `<Ellipse cx cy rx ry>` → a **unit circle inside a scaled `<Group>`**. Skia shares a gradient
 *     by handing the same `SkPaint` to many shapes (see `SkyPaints.ts`), and a shared shader needs
 *     one coordinate space, so the geometry moves into the group transform.
 *  2. **`rotate` is radians**, not SVG's degrees. Every angle out of the lib is degrees.
 *  3. `<Defs>` + `fill="url(#id)"` → the `paint` prop. There is no id table.
 *  4. `opacity` lives on the wrapping `<Group>`; SVG's `fillOpacity`/`strokeOpacity` have no direct
 *     counterpart, and folding alpha into a shared paint's colour would unshare it.
 *
 * `pointerEvents` is gone entirely — a Skia canvas has no hit-testable nodes. Picking runs against
 * coordinates in `SkyCanvas`'s gesture handlers, which is what the SVG copy was already doing.
 */
export function SkyWash({ root }: { root: Lobe }) {
  // Per tint, not per render of the deck: the wash's paints depend on nothing the camera touches.
  const paints = useMemo(() => washPaints(root.tint, WASH_ALPHA), [root.tint]);

  // The y axis carries the root's aspect, so the wash lies along the same principal axis its lobes
  // and halos do — an unrotated circular wash under an elongated deck reads as a spotlight.
  const spread = Math.max(root.sd, WASH_MIN_SPREAD);
  const aspect = root.aspect;
  const rotate = (root.angle * Math.PI) / 180;

  return (
    <Group
      transform={[{ translateX: root.cx }, { translateY: root.cy }, { rotate }]}
    >
      {WASH_LOBES.map((w, i) => (
        // Each lobe is the unit circle, placed by its own scale. The offsets are still measured in
        // world units off the root's spread, exactly as the SVG copy measured them.
        <Group
          key={i}
          opacity={w.alpha}
          transform={[
            { translateX: w.dx * spread },
            { translateY: w.dy * spread * aspect },
            { scaleX: w.rx * spread },
            { scaleY: w.rx * spread * aspect },
          ]}
        >
          <Circle cx={0} cy={0} r={1} paint={w.peak ? paints.peak : paints.body} />
        </Group>
      ))}
    </Group>
  );
}
