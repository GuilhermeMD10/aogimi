'use client';
import {
  memo,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { toWorld } from '../lib/camera';
import { NO_FULCRAL } from '../lib/cluster';
import {
  CLOUD_DRIFT_MS,
  LINK_GLOW_ALPHA,
  LINK_GLOW_PX,
  LINK_REACH,
  LINK_STRAND_ALPHA,
  LINK_STRAND_HOLD,
  LINK_STRAND_MAP_ALPHA,
  LINK_STRAND_MAP_PX,
  LINK_STRAND_PX,
  STAR_POP_MS,
  UNFOCUSED_DECK_OPACITY,
} from '../lib/config';
import { deckAt, frameAt, type SkyLayout } from '../lib/layout';
import { labelOpAt } from '../lib/lod';
import { type ColorStop, type SkyPalette, beadRamps, lerpHex, rankOf, strandRamps } from '../lib/palette';
import { pickStar } from '../lib/picking';
import type { DeckDraw, SkyFrame } from '../lib/tiers';
import type { Bounds, FocusPath, Star, View } from '../lib/types';

import { SkyClouds } from './SkyClouds';
import { type DeckFrameData, SkyFrames } from './SkyFrames';
import { SkyStars } from './SkyStars';
import { SkyWash } from './SkyWash';
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
  /* a strand's arrival. A fade rather than a dashoffset draw-in, which the solid stroke would now
     allow: the strand arrives *with* the star that brought it, and a line drawing itself across the
     sky would upstage the pop it is supposed to accompany. Opacity only, so it composes with the
     group's lineOp instead of fighting it. */
  .sky-edge { animation: sky-fade .7s ease-out both; }
  /* Radii carry zoom and must land on the same frame as the viewBox, so nothing sized from it is
     ever transitioned. Only entry animations live here, and they are one-shot. */
  .sky-star { animation: sky-pop ${STAR_POP_MS}ms ease-out; }
  .sky-open { animation: sky-pulse 1.8s ease-in-out infinite; }
  .sky-hover { animation: sky-fade .12s ease-out both; }
  .sky-new { animation: sky-new 1.7s ease-in-out infinite; }
  .sky-drift { animation: sky-turn ${CLOUD_DRIFT_MS}ms linear infinite; }
  .sky-deck { transition: opacity .45s ease; }
  /* the deck frame's hover brighten. fill/stroke only — neither is a function of zoom, so the
     no-transitions-on-camera-driven-values rule is not in play */
  .sky-frame { transition: fill .28s ease, stroke .28s ease; }
  /* the frameless deck's hover fog. Opacity only — it carries no zoom, so unlike a radius it does
     not have to land on the same frame as the viewBox */
  .sky-fog { transition: opacity .22s ease; }
  @media (prefers-reduced-motion: reduce) {
    .sky-edge, .sky-star, .sky-open, .sky-hover, .sky-new, .sky-drift, .sky-deck, .sky-frame,
    .sky-fog {
      animation: none; transition: none;
    }
  }
`;

/**
 * The glow behind a star, one gradient per rank. Built per *palette* rather than per frame: the
 * reader can change hue preset, but nothing about the camera touches these — the cloud gradients
 * are the ones that take their colours from data. The stops are softer than the reference's
 * (.5/.16): the glow was reading as a halo field, so its intensity comes down together with its
 * radius (STAR_GLOW_SCALE). The ids stay `sky-glow-{rank}` — SkyStars fills against them by rank.
 */
const glowDefs = (ranks: SkyPalette['ranks']) =>
  ranks.map((colour, rank) => (
    <radialGradient key={rank} id={`sky-glow-${rank}`}>
      <stop offset="0%" stopColor={colour} stopOpacity={0.34} />
      <stop offset="38%" stopColor={colour} stopOpacity={0.1} />
      <stop offset="100%" stopColor={colour} stopOpacity={0} />
    </radialGradient>
  ));

const stopsOf = (stops: ColorStop[]) =>
  stops.map((s) => <stop key={s.at} offset={`${s.at * 100}%`} stopColor={s.color} stopOpacity={s.alpha} />);

/**
 * The glass bead's two gradients, one pair per rank — the body and the caustic bounce beneath it.
 *
 * **Per rank, never per star.** Both are radius-independent (percentage stops, objectBoundingBox
 * focal points), so twelve defs cover every beaded star in the sky. Keying them by radius instead
 * would make `<defs>` camera-dependent, which rebuilds it every frame and throws away the paint
 * cache a pure pan rides on — the one way to make this design cost frames. Built per *palette*
 * alongside the glow, so a hue switch is the only thing that recomputes them.
 */
const beadDefs = (ranks: SkyPalette['ranks']) =>
  beadRamps(ranks).flatMap((bead, rank) => [
    <radialGradient key={`b${rank}`} id={`sky-bead-${rank}`} fx="33%" fy="27%">
      {stopsOf(bead.body)}
    </radialGradient>,
    <radialGradient key={`c${rank}`} id={`sky-caustic-${rank}`} fx="50%" fy="88%">
      {stopsOf(bead.caustic)}
    </radialGradient>,
  ]);

type DeckLayerProps = {
  deck: DeckDraw;
  /** The active hue preset. A module const out of SKY_PALETTES, so the memo below survives it. */
  palette: SkyPalette;
  /** Whether some other deck holds the focus, so this one fades to context. */
  dimmed: boolean;
  relZoom: number;
  /** This tier's relZoom ceiling — what the focused deck's star-size ramp is anchored to. */
  relZoomMax: number;
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
  palette,
  dimmed,
  relZoom,
  relZoomMax,
  u,
  hovered,
  selected,
  labelOp,
  tip,
}: DeckLayerProps) {
  const hoveredStar = hovered === null ? null : (deck.stars.find((s) => s.id === hovered) ?? null);

  /**
   * Each visible link resolved to the paint it draws with.
   *
   * A strand's colour is its two stars' ranks, but *how* those two colours are put on the line is a
   * cost decision, and it has three cases:
   *
   *   - **same rank** — the two endpoints agree, so a gradient would be a solid colour that also
   *     cost a `<defs>` entry. Flat. This is most links: a constellation is one study session, and
   *     cards studied together are usually at the same rung.
   *   - **mixed rank, focused deck** — a real `<linearGradient>` per pair. This is the only place a
   *     strand is long enough and thick enough on screen for a two-colour blend to be legible at
   *     all, and one focused deck's *visible* links (tiers.ts culls the rest) is a bounded number of
   *     defs rather than the whole sky's.
   *   - **mixed rank, anywhere else** — the flat midpoint. At the outer view a strand is a couple of
   *     pixels of a faint web under the clouds; the gradient would be invisible and the def real.
   *
   * `userSpaceOnUse` coordinates resolve in the user space of the element *referencing* the
   * gradient, and both the line and the def sit inside this deck's `translate(origin)` group — so
   * these are the generator's own local numbers, not world ones, and nothing here converts twice.
   * That is also why they survive the camera: a star's local position is fixed for the life of the
   * sky, so panning and zooming never re-anchor a single gradient. The memo is keyed on `deck.links`,
   * which `useSkyDraw`'s frame cache holds reference-stable through a pure pan.
   */
  const { strands, gradients } = useMemo(() => {
    const ramp = strandRamps(palette.ranks);
    const gradients: ReactElement[] = [];
    const strands = deck.links.map((l) => {
      const from = ramp[rankOf(l.a.mastery)];
      const to = ramp[rankOf(l.b.mastery)];
      if (from === to) return { l, stroke: from };
      if (!deck.focused) return { l, stroke: lerpHex(from, to, 0.5) };
      const gid = `sky-strand-${deck.did}-${l.a.id}-${l.b.id}`;
      gradients.push(
        <linearGradient
          key={gid}
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
        >
          {/* full alpha at both stops: a strand's transparency is the stroke's, so the two live in
              one place and the ramp never has to be re-derived when the presence changes */}
          <stop offset={`${LINK_STRAND_HOLD * 100}%`} stopColor={from} />
          <stop offset={`${(1 - LINK_STRAND_HOLD) * 100}%`} stopColor={to} />
        </linearGradient>,
      );
      return { l, stroke: `url(#${gid})` };
    });
    return { strands, gradients };
  }, [deck.links, deck.did, deck.focused, palette]);

  return (
    <g
      className="sky-deck"
      transform={`translate(${deck.origin.x} ${deck.origin.y})`}
      opacity={dimmed ? UNFOCUSED_DECK_OPACITY : 1}
    >
      {/* under everything, including the clouds: the deck's own atmosphere, which unlike every other
          soft layer here is not a stand-in for anything and so never fades out. See SkyWash. */}
      {deck.wash && <SkyWash root={deck.wash} scope={`${deck.did}`} />}

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

      {/* Constellation strands — see the strand block in config.ts for what they are and `strands`
          above for how each one's paint was chosen. Solid, round-capped: the guide (§4) draws them
          dashed u(2.6)/u(5.2), and a dash reads as a hint at a link where at this weight of star the
          links are structure. A strand fades in when the star it arrived with is new — `b` is always
          the newer endpoint. Keyed on `seen` rather than on mounting, because culling remounts shapes
          as they scroll back into view and a mount cannot tell the two apart.

          The group opacity is the crossfade's line weight, which is the layer's whole zoom story: it
          ramps 0→1 inside a focused deck as the cloud thins out (lod.ts) and is simply 1 at the outer
          view. No transition on it — `lineOp` already moves with the gesture, and easing it would only
          make the strands lag the geometry they connect. */}
      <g opacity={deck.layers.lineOp}>
        {gradients.length > 0 && <defs>{gradients}</defs>}

        {/* the bloom: the same strands, wide and very faint, under the crisp pass — a continuous glow
            end to end rather than a halo at the joints. Focused deck only, and a plain second stroke
            rather than a blur filter; both reasons are at LINK_GLOW_PX. It reuses the crisp pass's
            paint, so the gradient is defined once and referenced twice. */}
        {deck.focused &&
          strands.map(({ l, stroke }) => (
            <line
              key={`glow-${l.a.id}-${l.b.id}`}
              className={l.b.seen ? undefined : 'sky-edge'}
              x1={l.a.x}
              y1={l.a.y}
              x2={l.b.x}
              y2={l.b.y}
              stroke={stroke}
              strokeOpacity={LINK_GLOW_ALPHA}
              strokeWidth={LINK_GLOW_PX}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />
          ))}
        {strands.map(({ l, stroke }) => (
          <line
            key={`${l.a.id}-${l.b.id}`}
            className={l.b.seen ? undefined : 'sky-edge'}
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            stroke={stroke}
            strokeOpacity={deck.focused ? LINK_STRAND_ALPHA : LINK_STRAND_MAP_ALPHA}
            strokeWidth={deck.focused ? LINK_STRAND_PX : LINK_STRAND_MAP_PX}
            vectorEffect="non-scaling-stroke"
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
            ranks={palette.ranks}
            // the empty set on purpose: the 1.55× fulcral boost is for stand-ins that must be
            // findable at the outer view; here it made them out of the ordinary, and rank
            // alone is highlight enough
            fulcral={NO_FULCRAL}
            focused
            relZoom={relZoom}
            relZoomMax={relZoomMax}
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
          ranks={palette.ranks}
          fulcral={deck.fulcral}
          focused={deck.focused}
          starScale={deck.starScale}
          vivid={deck.vivid}
          relZoom={relZoom}
          relZoomMax={relZoomMax}
          u={u}
          hovered={hovered}
          selected={selected}
          labelOp={labelOp}
        />
      </g>

      {/* The hover readout names the card, and **only** names it. It used to append `· ×N` when the
          card had been reviewed, which put a figure under the cursor that the reader had not asked
          for and could not act on — a hover is a "what is this", not a report. The review count is
          still one click away in the panel, which is where a figure belongs.
          Skipped once the labels are up — the front text is already beside every star, and a second
          line under the cursor would double it. */}
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
          {hoveredStar.front}
        </text>
      )}
    </g>
  );
});

type Props = {
  frame: SkyFrame;
  layout: SkyLayout;
  /** The reader's hue preset, resolved by the host (`useSkyHue`) and threaded explicitly rather
   *  than read from a module: the lib is copied to mobile as-is and a mutable "active palette"
   *  there would be invisible to React and shared across SSR requests. */
  palette: SkyPalette;
  /** The world box the camera is confined to, drawn so the pan limit is visible rather than felt. */
  bounds: Bounds;
  focus: FocusPath;
  cam: CameraController;
  /** The open card's star id, or null. Drawn ringed; the panel is showing the same card. */
  selected: number | null;
  /** Newest star of the open session, which the reach ring is drawn around. */
  openTip: Star | null;
  /**
   * The outer view's deck card frames, already resolved to display data (SkyMap's job). Optional
   * because the demo host never shows the chooser; drawn only while
   * the focus is the outer view — a focused deck wears no frame, per the handover.
   */
  frames?: DeckFrameData[];
  /** Frame LOD: false draws each deck as its bare constellation with its name beneath. Decided by
   *  the host (`framedAt`), because it shapes the layout as well as the drawing. */
  framed?: boolean;
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
  palette,
  bounds,
  focus,
  cam,
  selected,
  openTip,
  frames,
  framed = true,
  onEnterDeck,
  onStarClick,
  onMiss,
  onSeen,
}: Props) {
  const { attach, camera, view, viewport, dragging, relZoom, relZoomMax, onPointerDown, onPointerMove, onPointerUp } =
    cam;
  const [hovered, setHovered] = useState<number | null>(null); // star id, stable across re-orderings
  const [hoveredDeck, setHoveredDeck] = useState<number | null>(null); // did, outer view only
  const hidden = frame.phase === 'hidden';
  const u = view.worldPerPx;
  const focusedDid = focus.length ? focus[0] : null;
  const focusedDeck = frame.decks.find((d) => d.focused) ?? null;
  // a function of zoom alone, like the layer crossfade — it lands on the same frame as the viewBox
  const labelOp = labelOpAt(camera.zoom);
  // per palette, not per frame: nothing camera-derived reaches either of them
  const glow = useMemo(() => glowDefs(palette.ranks), [palette]);
  const bead = useMemo(() => beadDefs(palette.ranks), [palette]);

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
    if (onPointerMove(e)) {
      setHovered(null);
      setHoveredDeck(null);
      return;
    }
    if (focusedDid === null) {
      // the chooser's subject is the deck frame — resolved by coordinates like a star pick is,
      // so the frames themselves never carry pointer handlers
      const world = toWorld(localOf(e.currentTarget, e), camera, viewport);
      setHoveredDeck(frameAt(layout, world, framed));
      return;
    }
    setHovered(pickAt(e)?.id ?? null);
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const wasTap = onPointerUp(e);
    if (!wasTap || hidden) return; // a drag is not a click
    if (focusedDid === null) {
      const world = toWorld(localOf(e.currentTarget, e), camera, viewport);
      // the frame is the primary target; deckAt keeps a press in the gutter meaningful too
      const did = deckAt(layout, world);
      if (did !== null) {
        setHoveredDeck(null);
        onEnterDeck(did);
      }
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
       framework; a host that wants a border or a radius puts it on the parent.

       **Transparent, deliberately** — the night behind the stars is the host's, not the canvas's.
       On /sky that host is the page itself (`--page-base` in ds-tokens.css), so the map has no
       edge and the chrome floating over it shares its plane; a host that draws the sky in a box of
       its own paints `skyBackground(palette.tint)` on the parent (see `Sky.tsx`). */
    <svg
      ref={attach}
      width="100%"
      height="100%"
      viewBox={viewBoxOf(view)}
      style={{
        display: 'block',
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
      onPointerLeave={() => {
        setHovered(null);
        setHoveredDeck(null);
      }}
    >
      <style>{SKY_CSS}</style>
      <defs>
        {glow}
        {bead}
      </defs>

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

      {/* The deck card frames, under the constellations they wrap. Outer view only: a focused
          deck wears no frame, and the dimmed context decks lose theirs with the tier. */}
      {!hidden && focusedDid === null && frames && frames.length > 0 && (
        <SkyFrames frames={frames} hovered={hoveredDeck} u={u} framed={framed} />
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
          palette={palette}
          dimmed={focusedDid !== null && !deck.focused}
          relZoom={relZoom}
          relZoomMax={relZoomMax}
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
