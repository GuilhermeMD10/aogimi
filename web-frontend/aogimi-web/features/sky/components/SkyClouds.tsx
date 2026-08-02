'use client';

import type { Lobe, MeshEdge } from '../lib/cluster';
import {
  CLOUD_DRIFT,
  CLOUD_DRIFT_MS,
  CLOUD_DRIFT_PHASES,
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

/** Which of CLOUD_DRIFT_PHASES a lobe's churn starts on, from its stable id — deterministic, so a
 *  re-render never restarts the motion, and staggered so neighbours never turn in step. */
const driftPhase = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % CLOUD_DRIFT_PHASES) + CLOUD_DRIFT_PHASES) % CLOUD_DRIFT_PHASES) / CLOUD_DRIFT_PHASES;
};

type Props = {
  halos: { lobe: Lobe; veil: number }[];
  lobes: Lobe[];
  edges: MeshEdge[];
  /** How far the whole layer is faded up. Inside a focused deck this is the zoom crossfade's
   *  cloudOp and must never be transitioned — see lib/sky/lod.ts; at the outer view it is 1 and
   *  the budget's veil does the fading instead. */
  opacity: number;
  /**
   * Namespaces the gradient ids. SVG ids are document-global and a lobe's id starts with its
   * group's — a *deck* id at the outer view, a *session* id inside one — and the two are both small
   * integers, so deck 5's root and session 5's root would otherwise fight over `sky-lobe-5` and
   * one of the two clouds would render with the other's colours.
   */
  scope: string;
  /** World units per screen px, for the parts of a cloud that are sized on screen rather than in
   *  the world — the mesh, and the floor under a lobe's radius. */
  u: number;
  /** Mass multiplier on the form radii — how this deck sizes against the sky's busiest. 1 inside. */
  mass?: number;
};

/**
 * A gradient per *tint family* rather than per form: a stop cannot take its colour from the shape
 * it fills (`currentColor` inside a gradient resolves against the gradient's own place in the
 * tree), so shapes reference defs by id — and the ids are quantised-tint keys, stable across
 * frames for the same reason lobe ids are: they are derived from data, never from the camera.
 */
const gradient = (id: string, stops: ColorStop[]) => (
  <radialGradient key={id} id={id}>
    {stops.map(({ at, color, alpha }) => (
      <stop key={at} offset={at} stopColor={color} stopOpacity={alpha} />
    ))}
  </radialGradient>
);

/**
 * What stands in for the stars a group could not afford to draw.
 *
 * Three layers, and the split between them is what keeps it from reading as a blob. The **fill** is
 * mass and scales with the world. The **mesh** — a hard point per lobe, joined into a spanning tree —
 * is structure and is sized in screen px, so it stays crisp however far out you are. The **glints**
 * are the busiest knots only, so the eye has somewhere to go while the cloud is burning off.
 *
 * Nothing here is keyed to a zoom threshold. A lobe exists because its group ran out of budget, and
 * fades on how much of that group is hidden — so the handover has no moment where anything pops.
 *
 * Inert on purpose. Picking runs against coordinates in the canvas's pointer handlers, so a cloud
 * taking pointer events would only get in the way of the pan underneath it.
 */
export function SkyClouds({ halos, lobes, edges, opacity, scope, u, mass = 1 }: Props) {
  // a mesh edge takes the colour of the group it belongs to
  const byGid = new Map(halos.map(({ lobe }) => [lobe.gid, lobe.tint.body]));

  // Gradients are shared by *quantised* tint rather than minted per lobe: sibling lobes of one
  // group differ by a hair of blend, which at 16 levels per channel is the same def. The def count
  // collapses from O(lobes) to the handful of tint families actually on screen — and radial
  // gradients are the most expensive paint in the scene, so fewer defs is fewer of exactly the
  // costly thing. Keys are data-derived, so they are stable across frames like lobe ids are.
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
      // sd, not the bounding box, so the lobe sits where the mass is. A bbox-sized lobe looks like
      // a grid cell; an sd-sized one looks like where the stars actually are. The px floor keeps a
      // small lobe visible instead of vanishing when the sky is pulled right back.
      rx: Math.max(LOBE_MIN_PX * u, lobe.sd * LOBE_SPREAD * mass),
    };
  });
  const withHaloKey = halos.map((h) => {
    const key = quantiseColor(h.lobe.tint.body).slice(1);
    if (!haloDefs.has(key)) haloDefs.set(key, quantiseTint(h.lobe.tint));
    return { ...h, key };
  });

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        {[...haloDefs].map(([key, tint]) => gradient(`sky-halo-${scope}-${key}`, haloStops(tint)))}
        {[...lobeDefs].map(([key, tint]) => gradient(`sky-lobe-${scope}-${key}`, lobeStops(tint)))}
        {[...hotDefs].map(([key, colour]) => gradient(`sky-hot-${scope}-${key}`, hotStops(colour)))}
      </defs>

      {/* the atmosphere: what a group's lobes sit inside. Its strength is the group's veil, so a
          group that has absorbed nothing has no halo and it fades in continuously as groups fold.
          Oriented like its lobes are: the covariance is aggregated at build time, so shaping the
          ellipse to the real spread costs the renderer nothing. */}
      {withHaloKey.map(({ lobe, veil, key }) => (
        <ellipse
          key={lobe.id}
          cx={lobe.cx}
          cy={lobe.cy}
          rx={lobe.sd * HALO_SPREAD * mass}
          ry={lobe.sd * HALO_SPREAD * mass * lobe.aspect}
          transform={`rotate(${lobe.angle} ${lobe.cx} ${lobe.cy})`}
          fill={`url(#sky-halo-${scope}-${key})`}
          opacity={veil * (0.42 + 0.58 * lobe.weight)}
        />
      ))}

      {/* The mass, as an offset pair rather than one ellipse — see LOBE_TWIN_*. The main lobe lies
          along the principal axis of the stars it hides, so the cloud echoes the shape of the
          drawing inside it; the twin drifts slowly around the centre (transform-only — cheap), so
          the vapour churns instead of sitting still. A lobe holding cards the reader has not been
          shown yet breathes, because at this distance those cards have no star of their own. */}
      {blobs.map(({ lobe, rx, key, hotKey }) => {
        const op = opacity * (0.32 + 0.68 * lobe.weight);
        return (
          <g key={lobe.id} className={lobe.unseen ? 'sky-new' : undefined}>
            <ellipse
              cx={lobe.cx}
              cy={lobe.cy}
              rx={rx}
              ry={rx * lobe.aspect}
              transform={`rotate(${lobe.angle} ${lobe.cx} ${lobe.cy})`}
              fill={`url(#sky-lobe-${scope}-${key})`}
              opacity={op}
            />
            {/* nested groups on purpose: the outer carries the position as an SVG attribute, the
                inner carries the CSS rotation — CSS transform would override an attribute transform
                on the same element, and rotating about the local origin is exactly the orbit */}
            <g transform={`translate(${lobe.cx} ${lobe.cy})`}>
              <g
                className={CLOUD_DRIFT ? 'sky-drift' : undefined}
                style={CLOUD_DRIFT ? { animationDelay: `${-driftPhase(lobe.id) * CLOUD_DRIFT_MS}ms` } : undefined}
              >
                <ellipse
                  cx={rx * LOBE_TWIN_DX}
                  cy={rx * LOBE_TWIN_DY}
                  rx={rx * LOBE_TWIN_RX}
                  ry={rx * LOBE_TWIN_RY}
                  fill={`url(#sky-lobe-${scope}-${key})`}
                  opacity={op * LOBE_TWIN_ALPHA}
                />
              </g>
            </g>
            {/* the gold core, at the mastered knot's own position rather than the lobe's centre —
                the cloud points at its contents before it resolves into stars */}
            {lobe.hot && hotKey && (
              <ellipse
                cx={lobe.hot.x}
                cy={lobe.hot.y}
                rx={rx * 0.5}
                ry={rx * 0.42}
                fill={`url(#sky-hot-${scope}-${hotKey})`}
                opacity={Math.min(1, op * lobe.hotW * 1.2)}
              />
            )}
          </g>
        );
      })}

      {/* the skeleton: the coarse graph that takes the vanished links' place at the same visual
          weight, which is what keeps a collapsed group looking like a drawing rather than a smear */}
      {edges.map((e) => (
        <line
          key={e.id}
          x1={e.ax}
          y1={e.ay}
          x2={e.bx}
          y2={e.by}
          stroke={byGid.get(e.gid) ?? 'white'}
          strokeOpacity={opacity * MESH_EDGE_OPACITY * (0.45 + 0.55 * e.weight)}
          strokeWidth={MESH_EDGE_PX}
          strokeDasharray="2.6 5.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* the nodes, and with them the peaks: radius runs with grain, so the tightest knots simply
          are the biggest points. Screen px, so they stay hard while the fill behind them softens. */}
      {blobs.map(({ lobe }) => (
        <circle
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
            <path
              key={lobe.id}
              d={`M${lobe.cx - arm} ${lobe.cy}H${lobe.cx + arm}M${lobe.cx} ${lobe.cy - arm}V${lobe.cy + arm}`}
              stroke={lobe.tint.peak}
              strokeOpacity={opacity * 0.3}
              strokeWidth={MESH_EDGE_PX}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
    </g>
  );
}
