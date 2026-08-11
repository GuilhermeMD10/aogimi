import { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';

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
import {
  type ColorStop,
  type GroupTint,
  haloStops,
  hotStops,
  lobeStops,
  quantiseColor,
  quantiseTint,
  tintKey,
} from '../lib/palette';

/**
 * What stands in for the stars a group could not afford to draw — the native port of the web's
 * `SkyClouds.tsx`. See that file for the three-layer split (fill / mesh / glints) and why nothing
 * here is keyed to a zoom threshold.
 *
 * ── What the native copy drops: the churn ────────────────────────────────────────────────────────
 * The web's twin lobe rotates forever (`.sky-drift`, a CSS keyframe on a transform), and the
 * unseen-lobe breathing (`.sky-new`) pulses `fill-opacity`. Neither is ported, and the twin is drawn
 * **static** at its resting offset instead.
 *
 * Not an oversight and not a stub. Those are CSS animations, and the only native equivalents are a
 * Reanimated node per lobe or a JS-driven timer — one animated node per cloud, repainting its region
 * every frame for the life of the screen, on the layer that already owns the sky's most expensive
 * paint (radial gradients). The web itself turns every one of these off under
 * `prefers-reduced-motion`, so a still sky is a state the design already supports and specifies.
 *
 * `CLOUD_DRIFT`, `CLOUD_DRIFT_MS` and `CLOUD_DRIFT_PHASES` are therefore unused here — deliberately
 * left in the copied `lib/config.ts` rather than deleted, because that file is a verbatim mirror of
 * the web's and `verify:sky` compares them.
 */
const gradient = (id: string, stops: ColorStop[]) => (
  <RadialGradient key={id} id={id}>
    {stops.map(({ at, color, alpha }) => (
      <Stop key={at} offset={at} stopColor={color} stopOpacity={alpha} />
    ))}
  </RadialGradient>
);

type Props = {
  halos: { lobe: Lobe; veil: number }[];
  lobes: Lobe[];
  edges: MeshEdge[];
  /** How far the whole layer is faded up — the zoom crossfade's cloudOp inside a focused deck. */
  opacity: number;
  /** Namespaces the gradient ids: SVG ids are document-global and a lobe's id starts with its
   *  group's, which is a small integer at both tiers. */
  scope: string;
  /** World units per screen px, for the parts sized on screen rather than in the world. */
  u: number;
  /** Mass multiplier on the form radii. 1 inside a focused deck. */
  mass?: number;
};

export function SkyClouds({ halos, lobes, edges, opacity, scope, u, mass = 1 }: Props) {
  // a mesh edge takes the colour of the group it belongs to
  const byGid = new Map(halos.map(({ lobe }) => [lobe.gid, lobe.tint.body]));

  // Gradients are shared by *quantised* tint rather than minted per lobe — see the web copy: the def
  // count collapses from O(lobes) to the handful of tint families on screen, and radial gradients
  // are the most expensive paint in the scene.
  const lobeDefs = new Map<string, GroupTint>();
  const haloDefs = new Map<string, GroupTint>();
  const hotDefs = new Map<string, string>();

  const blobs = lobes.map((lobe) => {
    const key = tintKey(lobe.tint);
    if (!lobeDefs.has(key)) lobeDefs.set(key, quantiseTint(lobe.tint));
    const hotKey = lobe.hot && lobe.hotW > HOT_CORE_MIN ? lobe.tint.peak.slice(1) : null;
    if (hotKey && !hotDefs.has(hotKey)) hotDefs.set(hotKey, lobe.tint.peak);
    return {
      lobe,
      key,
      hotKey,
      // sd, not the bounding box, so the lobe sits where the mass is. The px floor keeps a small
      // lobe visible instead of vanishing when the sky is pulled right back.
      rx: Math.max(LOBE_MIN_PX * u, lobe.sd * LOBE_SPREAD * mass),
    };
  });
  const withHaloKey = halos.map((h) => {
    const key = quantiseColor(h.lobe.tint.body).slice(1);
    if (!haloDefs.has(key)) haloDefs.set(key, quantiseTint(h.lobe.tint));
    return { ...h, key };
  });

  return (
    <G pointerEvents="none">
      <Defs>
        {[...haloDefs].map(([key, tint]) => gradient(`sky-halo-${scope}-${key}`, haloStops(tint)))}
        {[...lobeDefs].map(([key, tint]) => gradient(`sky-lobe-${scope}-${key}`, lobeStops(tint)))}
        {[...hotDefs].map(([key, colour]) => gradient(`sky-hot-${scope}-${key}`, hotStops(colour)))}
      </Defs>

      {/* the atmosphere: what a group's lobes sit inside. Its strength is the group's veil, so a
          group that has absorbed nothing has no halo and it fades in continuously as groups fold. */}
      {withHaloKey.map(({ lobe, veil, key }) => (
        <Ellipse
          key={lobe.id}
          cx={lobe.cx}
          cy={lobe.cy}
          rx={lobe.sd * HALO_SPREAD * mass}
          ry={lobe.sd * HALO_SPREAD * mass * lobe.aspect}
          transform={`rotate(${lobe.angle}, ${lobe.cx}, ${lobe.cy})`}
          fill={`url(#sky-halo-${scope}-${key})`}
          opacity={veil * (0.42 + 0.58 * lobe.weight)}
        />
      ))}

      {/* The mass, as an offset pair rather than one ellipse — see LOBE_TWIN_*. The main lobe lies
          along the principal axis of the stars it hides, so the cloud echoes the shape of the
          drawing inside it. The twin is static here — see the churn note above. */}
      {blobs.map(({ lobe, rx, key, hotKey }) => {
        const op = opacity * (0.32 + 0.68 * lobe.weight);
        return (
          <G key={lobe.id}>
            <Ellipse
              cx={lobe.cx}
              cy={lobe.cy}
              rx={rx}
              ry={rx * lobe.aspect}
              transform={`rotate(${lobe.angle}, ${lobe.cx}, ${lobe.cy})`}
              fill={`url(#sky-lobe-${scope}-${key})`}
              opacity={op}
            />
            {/* the twin's offset is baked into its centre rather than carried by a nested
                translate+rotate pair: without the CSS orbit there is nothing for the inner group
                to rotate, so the two wrappers the web needs collapse to none. */}
            <Ellipse
              cx={lobe.cx + rx * LOBE_TWIN_DX}
              cy={lobe.cy + rx * LOBE_TWIN_DY}
              rx={rx * LOBE_TWIN_RX}
              ry={rx * LOBE_TWIN_RY}
              fill={`url(#sky-lobe-${scope}-${key})`}
              opacity={op * LOBE_TWIN_ALPHA}
            />
            {/* the gold core, at the mastered knot's own position rather than the lobe's centre —
                the cloud points at its contents before it resolves into stars */}
            {lobe.hot && hotKey && (
              <Ellipse
                cx={lobe.hot.x}
                cy={lobe.hot.y}
                rx={rx * 0.5}
                ry={rx * 0.42}
                fill={`url(#sky-hot-${scope}-${hotKey})`}
                opacity={Math.min(1, op * lobe.hotW * 1.2)}
              />
            )}
          </G>
        );
      })}

      {/* the skeleton: the coarse graph that takes the vanished links' place at the same visual
          weight, which is what keeps a collapsed group looking like a drawing rather than a smear.
          Sized in screen px via `u` — see the stroke note in SkyStars. */}
      {edges.map((e) => (
        <Line
          key={e.id}
          x1={e.ax}
          y1={e.ay}
          x2={e.bx}
          y2={e.by}
          stroke={byGid.get(e.gid) ?? 'white'}
          strokeOpacity={opacity * MESH_EDGE_OPACITY * (0.45 + 0.55 * e.weight)}
          strokeWidth={MESH_EDGE_PX * u}
          strokeDasharray={[2.6 * u, 5.2 * u]}
          strokeLinecap="round"
        />
      ))}

      {/* the nodes, and with them the peaks: radius runs with grain, so the tightest knots simply
          are the biggest points. Screen px, so they stay hard while the fill behind them softens. */}
      {blobs.map(({ lobe }) => (
        <Circle
          key={lobe.id}
          cx={lobe.cx}
          cy={lobe.cy}
          r={(MESH_POINT_MIN_PX + (MESH_POINT_MAX_PX - MESH_POINT_MIN_PX) * lobe.grain) * u}
          fill={lobe.tint.peak}
          fillOpacity={opacity * (0.5 + 0.5 * lobe.grain)}
        />
      ))}

      {/* a busy knot glints before it resolves into stars — the payoff detail of the whole layer */}
      {blobs
        .filter(({ lobe }) => lobe.grain > MESH_PEAK_GRAIN)
        .map(({ lobe, rx }) => {
          const arm = rx * 0.6;
          return (
            <Path
              key={lobe.id}
              d={`M${lobe.cx - arm} ${lobe.cy}H${lobe.cx + arm}M${lobe.cx} ${lobe.cy - arm}V${lobe.cy + arm}`}
              stroke={lobe.tint.peak}
              strokeOpacity={opacity * 0.3}
              strokeWidth={MESH_EDGE_PX * u}
            />
          );
        })}
    </G>
  );
}
