import { useMemo } from 'react';
import { Circle, DashPathEffect, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';

import type { Lobe, MeshEdge } from '../lib/cluster';
import {
  HALO_SPREAD,
  HOT_CORE_MIN,
  LOBE_MIN_PX,
  LOBE_SPREAD,
  LOBE_TWIN_ALPHA,
  LOBE_TWIN_DX,
  LOBE_TWIN_DY,
  LOBE_TWIN_RX,
  LOBE_TWIN_RY,
  MESH_EDGE_OPACITY,
  MESH_EDGE_PX,
  MESH_PEAK_GRAIN,
  MESH_POINT_MAX_PX,
  MESH_POINT_MIN_PX,
} from '../lib/config';

import { cloudPaints, haloKey, hotKey, lobeKey } from './SkyPaints';

/**
 * What stands in for the stars a group could not afford to draw. See the web copy for the three-layer
 * split (fill / mesh / glints) and why nothing here is keyed to a zoom threshold.
 *
 * Read `SkyWash.tsx`'s header first — it states the four SVG→Skia translation rules every component
 * in this folder follows, and this file is the one that leans on all four.
 *
 * ── What the native copy still drops: the churn ───────────────────────────────────────────────────
 * The web's twin lobe rotates forever (`.sky-drift`) and its unseen lobes breathe (`.sky-new`).
 * Neither is ported and the twin is drawn **static** at its resting offset, exactly as the SVG copy
 * left it. The reasoning has changed shape, though, and is worth restating: with the camera now on the
 * UI thread, a drift *could* be a shader uniform driven by a clock for near-nothing — this is the
 * layer where that becomes cheap rather than the layer where it was expensive. It is left out here
 * only to keep the port a port. `CLOUD_DRIFT`, `CLOUD_DRIFT_MS` and `CLOUD_DRIFT_PHASES` remain unused
 * in the copied `lib/config.ts` (deliberately, since `verify:sky` compares that file byte for byte),
 * and they are what a drift pass should read.
 */

type Props = {
  halos: { lobe: Lobe; veil: number }[];
  lobes: Lobe[];
  edges: MeshEdge[];
  /** How far the whole layer is faded up — the zoom crossfade's cloudOp inside a focused deck. */
  opacity: number;
  /** World units per screen px, for the parts sized on screen rather than in the world. */
  u: number;
  /** Mass multiplier on the form radii. 1 inside a focused deck. */
  mass?: number;
};

export function SkyClouds({ halos, lobes, edges, opacity, u, mass = 1 }: Props) {
  // A mesh edge takes the colour of the group it belongs to.
  const byGid = useMemo(
    () => new Map(halos.map(({ lobe }) => [lobe.gid, lobe.tint.body])),
    [halos],
  );

  /**
   * Paints keyed by **quantised** tint, so two lobes whose tints differ by less than a perceptible
   * step share one shader — the def-sharing the SVG copy got from `<defs>` ids, preserved through the
   * `paint` prop. Memoised on the lobe/halo arrays, which the frame cache keeps reference-stable
   * across a pan, so a pan rebuilds no shaders at all.
   */
  const paints = useMemo(() => cloudPaints(lobes, halos, HOT_CORE_MIN), [lobes, halos]);

  const blobs = useMemo(
    () =>
      lobes.map((lobe) => ({
        lobe,
        // `sd`, not the bounding box, so the lobe sits where the mass is. The px floor keeps a small
        // lobe visible instead of vanishing when the sky is pulled right back.
        rx: Math.max(LOBE_MIN_PX * u, lobe.sd * LOBE_SPREAD * mass),
      })),
    [lobes, u, mass],
  );

  /** The glint is two crossed strokes; one `Path` per peak, built from the same arm length the SVG
   *  copy used. Rebuilt only when the blobs are. */
  const glints = useMemo(
    () =>
      blobs
        .filter(({ lobe }) => lobe.grain > MESH_PEAK_GRAIN)
        .map(({ lobe, rx }) => {
          const arm = rx * 0.6;
          const path = Skia.Path.Make();
          path.moveTo(lobe.cx - arm, lobe.cy);
          path.lineTo(lobe.cx + arm, lobe.cy);
          path.moveTo(lobe.cx, lobe.cy - arm);
          path.lineTo(lobe.cx, lobe.cy + arm);
          return { id: lobe.id, path, colour: lobe.tint.peak };
        }),
    [blobs],
  );

  return (
    <Group>
      {/* The atmosphere: what a group's lobes sit inside. Its strength is the group's veil, so a
          group that has absorbed nothing has no halo and it fades in continuously as groups fold. */}
      {halos.map(({ lobe, veil }) => {
        const paint = paints.halo.get(haloKey(lobe.tint));
        if (!paint) return null;
        const r = lobe.sd * HALO_SPREAD * mass;
        return (
          <Group
            key={lobe.id}
            opacity={veil * (0.42 + 0.58 * lobe.weight)}
            transform={[
              { translateX: lobe.cx },
              { translateY: lobe.cy },
              { rotate: (lobe.angle * Math.PI) / 180 },
              { scaleX: r },
              { scaleY: r * lobe.aspect },
            ]}
          >
            <Circle cx={0} cy={0} r={1} paint={paint} />
          </Group>
        );
      })}

      {/* The mass, as an offset pair rather than one ellipse — see LOBE_TWIN_*. The main lobe lies
          along the principal axis of the stars it hides, so the cloud echoes the shape of the drawing
          inside it. */}
      {blobs.map(({ lobe, rx }) => {
        const paint = paints.lobe.get(lobeKey(lobe.tint));
        if (!paint) return null;
        const op = opacity * (0.32 + 0.68 * lobe.weight);
        const hot = lobe.hot && lobe.hotW > HOT_CORE_MIN ? paints.hot.get(hotKey(lobe.tint)) : null;
        const rotate = (lobe.angle * Math.PI) / 180;
        return (
          <Group key={lobe.id}>
            <Group
              opacity={op}
              transform={[
                { translateX: lobe.cx },
                { translateY: lobe.cy },
                { rotate },
                { scaleX: rx },
                { scaleY: rx * lobe.aspect },
              ]}
            >
              <Circle cx={0} cy={0} r={1} paint={paint} />
            </Group>

            {/* The twin's offset is baked into its own translate rather than carried by a nested
                orbit: without the CSS rotation there is nothing for an inner group to spin. */}
            <Group
              opacity={op * LOBE_TWIN_ALPHA}
              transform={[
                { translateX: lobe.cx + rx * LOBE_TWIN_DX },
                { translateY: lobe.cy + rx * LOBE_TWIN_DY },
                { rotate },
                { scaleX: rx * LOBE_TWIN_RX },
                { scaleY: rx * LOBE_TWIN_RY },
              ]}
            >
              <Circle cx={0} cy={0} r={1} paint={paint} />
            </Group>

            {/* The gold core, at the mastered knot's own position rather than the lobe's centre —
                the cloud points at its contents before it resolves into stars. */}
            {lobe.hot && hot && (
              <Group
                opacity={Math.min(1, op * lobe.hotW * 1.2)}
                transform={[
                  { translateX: lobe.hot.x },
                  { translateY: lobe.hot.y },
                  { scaleX: rx * 0.5 },
                  { scaleY: rx * 0.42 },
                ]}
              >
                <Circle cx={0} cy={0} r={1} paint={hot} />
              </Group>
            )}
          </Group>
        );
      })}

      {/* The skeleton: the coarse graph that takes the vanished links' place at the same visual
          weight, which is what keeps a collapsed group looking like a drawing rather than a smear.
          Sized in screen px via `u` — see the stroke note in SkyStars. */}
      {edges.map((e) => (
        <Line
          key={e.id}
          p1={vec(e.ax, e.ay)}
          p2={vec(e.bx, e.by)}
          color={byGid.get(e.gid) ?? 'white'}
          style="stroke"
          strokeWidth={MESH_EDGE_PX * u}
          strokeCap="round"
          opacity={opacity * MESH_EDGE_OPACITY * (0.45 + 0.55 * e.weight)}
        >
          <DashPathEffect intervals={[2.6 * u, 5.2 * u]} />
        </Line>
      ))}

      {/* The nodes, and with them the peaks: radius runs with grain, so the tightest knots simply are
          the biggest points. Screen px, so they stay hard while the fill behind them softens. */}
      {blobs.map(({ lobe }) => (
        <Circle
          key={lobe.id}
          cx={lobe.cx}
          cy={lobe.cy}
          r={(MESH_POINT_MIN_PX + (MESH_POINT_MAX_PX - MESH_POINT_MIN_PX) * lobe.grain) * u}
          color={lobe.tint.peak}
          opacity={opacity * (0.5 + 0.5 * lobe.grain)}
        />
      ))}

      {/* A busy knot glints before it resolves into stars — the payoff detail of the whole layer. */}
      {glints.map(({ id, path, colour }) => (
        <Path
          key={id}
          path={path}
          color={colour}
          style="stroke"
          strokeWidth={MESH_EDGE_PX * u}
          opacity={opacity * 0.3}
        />
      ))}
    </Group>
  );
}
