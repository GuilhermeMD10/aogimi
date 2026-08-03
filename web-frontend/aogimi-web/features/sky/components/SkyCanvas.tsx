'use client';
import { memo, type PointerEvent as ReactPointerEvent, useEffect, useState } from 'react';

import { toWorld } from '../lib/camera';
import { NO_FULCRAL } from '../lib/cluster';
import { CLOUD_DRIFT_MS, LINK_REACH, STAR_POP_MS, UNFOCUSED_DECK_OPACITY } from '../lib/config';
import { deckAt, type SkyLayout } from '../lib/layout';
import { labelOpAt } from '../lib/lod';
import { LINE_COLOR, RANK_COLORS, hueFor } from '../lib/palette';
import { pickStar } from '../lib/picking';
import type { DeckDraw, SkyFrame } from '../lib/tiers';
import type { Bounds, FocusPath, Star, View } from '../lib/types';

import { SkyClouds } from './SkyClouds';
import { SkyStars } from './SkyStars';
import { type CameraController, localOf } from '../hooks/useCamera';

/** The one place the world rectangle gets SVG's formatting; every other renderer wants numbers. */
const viewBoxOf = (v: View) => `${v.minX} ${v.minY} ${v.spanX} ${v.spanY}`;

/** Static, so it is not rebuilt on every camera frame. */
const SKY_CSS = `
  @keyframes sky-pop  { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
  @keyframes sky-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes sky-pulse { 0%,100% { opacity: .3; } 50% { opacity: .08; } }
  /* fill-opacity, not opacity: a lobe's own opacity is a function of what it has absorbed and must
     land with the viewBox, so the pulse has to ride on a property nothing else is driving. */
  @keyframes sky-new  { 0%,100% { fill-opacity: 1; } 50% { fill-opacity: .45; } }
  /* the cloud's churn: transform-only, so the browser never re-uploads a gradient for it */
  @keyframes sky-turn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  /* a fade rather than a dashoffset draw-in: the lines are dashed now, and offsetting a dash
     pattern reads as marching ants rather than as a line being drawn */
  .sky-edge { animation: sky-fade .7s ease-out both; }
  /* Radii carry zoom and must land on the same frame as the viewBox, so nothing sized from it is
     ever transitioned. Only entry animations live here, and they are one-shot. */
  .sky-star { animation: sky-pop ${STAR_POP_MS}ms ease-out; }
  .sky-open { animation: sky-pulse 1.8s ease-in-out infinite; }
  .sky-hover { animation: sky-fade .12s ease-out both; }
  .sky-new { animation: sky-new 1.7s ease-in-out infinite; }
  .sky-drift { animation: sky-turn ${CLOUD_DRIFT_MS}ms linear infinite; }
  .sky-deck { transition: opacity .45s ease; }
  @media (prefers-reduced-motion: reduce) {
    .sky-edge, .sky-star, .sky-open, .sky-hover, .sky-new, .sky-drift, .sky-deck {
      animation: none; transition: none;
    }
  }
`;

/**
 * The glow behind a star, one gradient per rank. Static — the palette does not change at runtime —
 * so these are built once rather than per frame like the cloud gradients, which take their colours
 * from data. The stops are softer than the reference's (.5/.16): the glow was reading as a halo
 * field, so its intensity comes down together with its radius (STAR_GLOW_SCALE).
 */
const GLOW_DEFS = RANK_COLORS.map((colour, rank) => (
  <radialGradient key={rank} id={`sky-glow-${rank}`}>
    <stop offset="0%" stopColor={colour} stopOpacity={0.34} />
    <stop offset="38%" stopColor={colour} stopOpacity={0.1} />
    <stop offset="100%" stopColor={colour} stopOpacity={0} />
  </radialGradient>
));

type DeckLayerProps = {
  deck: DeckDraw;
  /** Whether some other deck holds the focus, so this one fades to context. */
  dimmed: boolean;
  tinted: boolean;
  relZoom: number;
  u: number;
  /** Hovered star id, already gated to this deck by the parent. */
  hovered: number | null;
  /** Selected star id, gated to this deck like hover — a primitive, so the memo survives it. */
  selected: number | null;
  /** Front-label strength, already zeroed by the parent for every deck but the focused one. */
  labelOp: number;
  /** The open session's newest star, already gated to this deck by the parent. */
  tip: Star | null;
};

/**
 * Everything one deck draws, memoised — and the memo is the pay-off of the frame cache in
 * `useSkyDraw`. During a pure pan the frame object is *reused*, `u` and `relZoom` only move with
 * zoom, and hover is parked while dragging — so every prop here is reference-identical, React
 * skips this whole subtree, and a pan frame reconciles nothing but the svg's viewBox attribute.
 * Anything camera-derived that sneaks in here as a fresh object per frame silently undoes that.
 */
const DeckLayer = memo(function DeckLayer({
  deck,
  dimmed,
  tinted,
  relZoom,
  u,
  hovered,
  selected,
  labelOp,
  tip,
}: DeckLayerProps) {
  const hoveredStar = hovered === null ? null : (deck.stars.find((s) => s.id === hovered) ?? null);
  return (
    <g
      className="sky-deck"
      transform={`translate(${deck.origin.x} ${deck.origin.y})`}
      opacity={dimmed ? UNFOCUSED_DECK_OPACITY : 1}
    >
      {(deck.lobes.length > 0 || deck.halos.length > 0) && (
        <SkyClouds
          halos={deck.halos}
          lobes={deck.lobes}
          edges={deck.edges}
          opacity={deck.layers.cloudOp}
          scope={`${deck.focused ? 'f' : 'o'}${deck.did}`}
          u={u}
          mass={deck.mass}
        />
      )}

      {/* the reach ring belongs to the drawing, not to the cloud, so it arrives with the lines */}
      {tip && deck.layers.lineOp > 0 && (
        <circle
          className="sky-open"
          cx={tip.x}
          cy={tip.y}
          r={LINK_REACH}
          fill="none"
          stroke="white"
          strokeOpacity={0.3 * deck.layers.lineOp}
          strokeDasharray={`${2 * u} ${6 * u}`}
          strokeWidth={u}
        />
      )}

      {/* Constellation lines, per the guide (§4): the night palette's line colour, dashed
          u(2.6)/u(5.2) with round caps — the dash pattern is in screen px because the stroke is
          non-scaling, so it reads the same at every zoom. A link fades in when the star it
          brought with it is new — `b` is always the newer endpoint. Keyed on `seen` rather than
          on mounting, because culling remounts shapes as they scroll back into view and a mount
          cannot tell the two apart. The group opacity is the crossfade's line weight — 1 at the
          outer view. */}
      <g opacity={deck.layers.lineOp}>
        {deck.links.map((l) => (
          <line
            key={`${l.a.id}-${l.b.id}`}
            className={l.b.seen ? undefined : 'sky-edge'}
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            stroke={tinted ? hueFor(l.cid) : LINE_COLOR}
            strokeOpacity={deck.focused ? 0.42 : 0.38}
            strokeWidth={deck.focused ? 1 : 1.2}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="2.6 5.2"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* the condensed interior's real stars: budget survivors among the clouds, fading out
          exactly as the full layer beneath fades in — the survivors are in both sets, so they
          hand over to themselves without a seam */}
      {deck.preview && deck.preview.op > 0 && (
        <g opacity={deck.preview.op}>
          <SkyStars
            stars={deck.preview.stars}
            // the empty set on purpose: the 1.55× fulcral boost is for stand-ins that must be
            // findable at the outer view; here it made them out of the ordinary, and rank
            // alone is highlight enough
            fulcral={NO_FULCRAL}
            focused
            relZoom={relZoom}
            u={u}
            hovered={null}
            // no ring and no labels in the preview: it exists below the label zoom by
            // construction, and the selected star may not be among its survivors
            selected={null}
            labelOp={0}
          />
        </g>
      )}

      <g opacity={deck.layers.starOp}>
        <SkyStars
          stars={deck.stars}
          fulcral={deck.fulcral}
          focused={deck.focused}
          relZoom={relZoom}
          u={u}
          hovered={hovered}
          selected={selected}
          labelOp={labelOp}
        />
      </g>

      {/* the hover readout names the card. Skipped once the labels are up — the front text is
          already beside every star, and a second line under the cursor would double it. */}
      {hoveredStar && deck.focused && labelOp <= 0.01 && (
        <text
          className="sky-hover"
          x={hoveredStar.x + 14 * u}
          y={hoveredStar.y + 4 * u}
          fill="white"
          fillOpacity={0.8}
          fontSize={12 * u}
          style={{ pointerEvents: 'none' }}
        >
          {hoveredStar.count > 0 ? `${hoveredStar.front} · ×${hoveredStar.count}` : hoveredStar.front}
        </text>
      )}
    </g>
  );
});

type Props = {
  frame: SkyFrame;
  layout: SkyLayout;
  /** The world box the camera is confined to, drawn so the pan limit is visible rather than felt. */
  bounds: Bounds;
  focus: FocusPath;
  /** Colour the links by their session. Clouds are never tinted this way — they take their colour
   *  from the stars underneath them, which is the same rule a star's own colour follows. */
  tinted: boolean;
  cam: CameraController;
  /** The open card's star id, or null. Drawn ringed; the panel is showing the same card. */
  selected: number | null;
  /** Newest star of the open session, which the reach ring is drawn around. */
  openTip: Star | null;
  /** A press at the outer view chooses a deck rather than a star. */
  onEnterDeck: (did: number) => void;
  onStarClick: (star: Star) => void;
  /** A tap inside a focused deck that hit no star — empty sky, which the hosts read as "clear
   *  the selection". Optional because the demo has nothing to clear that way. */
  onMiss?: () => void;
  /** These stars have now finished popping in and should never pop again. */
  onSeen: (ids: number[]) => void;
};

export function SkyCanvas({
  frame,
  layout,
  bounds,
  focus,
  tinted,
  cam,
  selected,
  openTip,
  onEnterDeck,
  onStarClick,
  onMiss,
  onSeen,
}: Props) {
  const { attach, camera, view, viewport, dragging, relZoom, onPointerDown, onPointerMove, onPointerUp } = cam;
  const [hovered, setHovered] = useState<number | null>(null); // star id, stable across re-orderings
  const hidden = frame.phase === 'hidden';
  const u = view.worldPerPx;
  const focusedDid = focus.length ? focus[0] : null;
  const focusedDeck = frame.decks.find((d) => d.focused) ?? null;
  // a function of zoom alone, like the layer crossfade — it lands on the same frame as the viewBox
  const labelOp = labelOpAt(camera.zoom);

  /**
   * A press means different things at different tiers, and that is the whole interaction: at the
   * outer view there are no individual cards worth aiming at, so a press chooses a deck; inside one,
   * the stars are the subject and a press reviews a card.
   *
   * Picking runs against the stars the tier decided to draw, which does two jobs at once: it costs
   * O(what is on screen) rather than O(the sky), and a card standing inside a cloud has no star to
   * hit — no reviewing something you cannot see.
   */
  const pickAt = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!focusedDeck) return null;
    const world = toWorld(localOf(e.currentTarget, e), camera, viewport);
    const local = { x: world.x - focusedDeck.origin.x, y: world.y - focusedDeck.origin.y };
    const i = pickStar(focusedDeck.stars, local, camera.zoom);
    return i < 0 ? null : focusedDeck.stars[i];
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    // the sky is moving under the cursor, so a hover readout would only flicker
    if (onPointerMove(e)) return setHovered(null);
    setHovered(pickAt(e)?.id ?? null);
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const wasTap = onPointerUp(e);
    if (!wasTap || hidden) return; // a drag is not a click
    if (focusedDid === null) {
      const world = toWorld(localOf(e.currentTarget, e), camera, viewport);
      const did = deckAt(layout, world);
      if (did !== null) onEnterDeck(did);
      return;
    }
    const star = pickAt(e);
    setHovered(star?.id ?? null);
    if (star) onStarClick(star);
    else onMiss?.(); // empty sky: the click meant "nothing", and the hosts read that as deselect
  };

  /**
   * Cards arrive in the background, so a star is owed its arrival until it has actually been drawn —
   * which is what `seen` records. Everything currently on screen and still unseen is mid-pop.
   *
   * The marking has to wait for the animation to finish. Doing it on the render that draws them
   * would drop the class on the very next commit and cancel the pop it was meant to allow, and
   * `animationend` never fires under prefers-reduced-motion. One timer for the whole batch is
   * enough: re-arming it when more scroll into view costs nothing, because the class is inert once
   * the animation has played out.
   */
  // preview stars are genuinely drawn too, so they are owed their pop — and owed being marked
  // seen, or culling would replay the arrival every time one scrolls back into view
  const popping = frame.decks.flatMap((d) =>
    [...d.stars, ...(d.preview?.stars ?? [])].filter((s) => !s.seen).map((s) => s.id),
  );
  const poppingKey = popping.join(','); // a value dep, so the timer re-arms only when the set changes
  useEffect(() => {
    if (!popping.length) return;
    const timer = setTimeout(() => onSeen(popping), STAR_POP_MS + 60);
    return () => clearTimeout(timer);
    // popping is deliberately absent: poppingKey is its value, and depending on the array itself
    // would re-arm the timer every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poppingKey, onSeen]);

  return (
    /* Fills whatever box the host gives it — the camera works off the ResizeObserver in `attach`,
       never off these attributes, so the only requirement is that the parent has a size. Styling is
       inline rather than class-based so the canvas carries no dependency on the host's CSS
       framework; a host that wants a border or a radius puts it on the parent. */
    <svg
      ref={attach}
      width="100%"
      height="100%"
      viewBox={viewBoxOf(view)}
      style={{
        display: 'block',
        background: 'radial-gradient(circle at 50% 45%, #0b1020 0%, #000 80%)',
        touchAction: 'none', // we own the gesture; stop the browser scrolling the page instead
        cursor: hidden
          ? 'default'
          : dragging
            ? 'grabbing'
            : focusedDid === null || hovered !== null
              ? 'pointer'
              : 'grab',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setHovered(null)}
    >
      <style>{SKY_CSS}</style>
      <defs>{GLOW_DEFS}</defs>

      {/* the edge of what the camera may reach — the whole grid at the outer view, one deck inside it */}
      {!hidden && (
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxY - bounds.minY}
          fill="none"
          stroke="white"
          strokeOpacity={0.1}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          strokeDasharray="4 8"
        />
      )}

      {/* One transform per deck, which is the whole of what the layout does to a deck's contents.
          Everything inside is in that deck's own local coordinates — the same numbers the generator
          placed and the same numbers its quadtree was built from, so nothing is converted twice.
          Each layer is memoised; during a pure pan every prop is reference-identical and the whole
          scene is skipped — see DeckLayer. */}
      {frame.decks.map((deck) => (
        <DeckLayer
          key={deck.did}
          deck={deck}
          dimmed={focusedDid !== null && !deck.focused}
          tinted={tinted}
          relZoom={relZoom}
          u={u}
          hovered={deck.focused ? hovered : null}
          selected={deck.focused ? selected : null}
          labelOp={deck.focused ? labelOp : 0}
          tip={openTip && openTip.did === deck.did ? openTip : null}
        />
      ))}
    </svg>
  );
}
