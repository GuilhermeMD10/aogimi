import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, G, Line, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { toWorld } from '../lib/camera';
import { NO_FULCRAL } from '../lib/cluster';
import {
  LINK_GLOW_ALPHA,
  LINK_GLOW_PX,
  LINK_REACH,
  LINK_STRAND_ALPHA,
  LINK_STRAND_HOLD,
  LINK_STRAND_MAP_ALPHA,
  LINK_STRAND_MAP_PX,
  LINK_STRAND_PX,
  UNFOCUSED_DECK_OPACITY,
} from '../lib/config';
import { deckAt, frameAt, type SkyLayout } from '../lib/layout';
import { labelOpAt } from '../lib/lod';
import { type ColorStop, type SkyPalette, beadRamps, lerpHex, rankOf, strandRamps } from '../lib/palette';
import { pickStar } from '../lib/picking';
import type { DeckDraw, SkyFrame } from '../lib/tiers';
import type { FocusPath, Point, Star, View as SkyView } from '../lib/types';

import { SkyClouds } from './SkyClouds';
import { type DeckFrameData, SkyFrames } from './SkyFrames';
import { SkyStars } from './SkyStars';
import { SkyWash } from './SkyWash';
import type { CameraController } from '../hooks/useCamera';

/**
 * The native port of the web's `SkyCanvas.tsx` — the renderer host and the one place gestures live.
 *
 * ── What replaced the DOM ────────────────────────────────────────────────────────────────────────
 *   `<svg viewBox>`                → `<Svg viewBox>` (same string, same meaning)
 *   `<style>` + CSS keyframes      → nothing. See the animation note in SkyStars.
 *   onPointerDown/Move/Up          → a `react-native-gesture-handler` tree, below
 *   `cursor`                       → nothing to express on a touch screen
 *   hover                          → a **press** state, which is the touch question worth asking
 *
 * ── The gesture tree ────────────────────────────────────────────────────────────────────────────
 * Three recognisers, composed rather than nested by hand:
 *
 *   Pan   — drives the camera. Its coordinates are already view-local, which is what the web needed
 *           `getBoundingClientRect` for.
 *   Pinch — one `onUpdate` per step, converted to the plain multiplier `lib/camera` wants. The pinch
 *           *focal point* is the anchor, so the sky zooms about the fingers exactly as the web zooms
 *           about the cursor.
 *   Tap   — selection. Separate from Pan on purpose: the web infers "was this a click" from whether
 *           the drag passed DRAG_SLOP_PX, and the camera hook still does that (`onPanEnd` returns
 *           it), but a real Tap recogniser also gives the press-down feedback the frames want.
 *
 * `Gesture.Simultaneous(pan, pinch)` because a two-finger gesture is both; Tap is exclusive of the
 * pan by construction — gesture-handler will not fire it once the pan has begun moving.
 *
 * **Everything is `runOnJS`.** The camera is React state (a pose machine with flights and a clamp),
 * not a shared value, so there is no worklet path to keep it off the JS thread — the same trade the
 * web makes with React state and rAF. The frame cache in `useSkyDraw` is what makes that affordable:
 * a pure pan recomputes nothing and reconciles nothing but the viewBox.
 */

/** The one place the world rectangle gets SVG's formatting; every other renderer wants numbers. */
const viewBoxOf = (v: SkyView) => `${v.minX} ${v.minY} ${v.spanX} ${v.spanY}`;

/**
 * The glow behind a star, one gradient per rank. Built per *palette* rather than per frame: nothing
 * about the camera touches these. The ids stay `sky-glow-{rank}` — SkyStars fills against them.
 */
const glowDefs = (ranks: SkyPalette['ranks']) =>
  ranks.map((colour, rank) => (
    <RadialGradient key={rank} id={`sky-glow-${rank}`}>
      <Stop offset="0%" stopColor={colour} stopOpacity={0.34} />
      <Stop offset="38%" stopColor={colour} stopOpacity={0.1} />
      <Stop offset="100%" stopColor={colour} stopOpacity={0} />
    </RadialGradient>
  ));

const stopsOf = (stops: ColorStop[]) =>
  stops.map((s) => <Stop key={s.at} offset={`${s.at * 100}%`} stopColor={s.color} stopOpacity={s.alpha} />);

/**
 * The glass bead's two gradients, one pair per rank — the body and the caustic bounce beneath it.
 * **Per rank, never per star**: both are radius-independent, so twelve defs cover every beaded star
 * in the sky. Keying them by radius would make `<Defs>` camera-dependent and throw away the paint
 * cache a pure pan rides on.
 */
const beadDefs = (ranks: SkyPalette['ranks']) =>
  beadRamps(ranks).flatMap((bead, rank) => [
    <RadialGradient key={`b${rank}`} id={`sky-bead-${rank}`} fx="33%" fy="27%">
      {stopsOf(bead.body)}
    </RadialGradient>,
    <RadialGradient key={`c${rank}`} id={`sky-caustic-${rank}`} fx="50%" fy="88%">
      {stopsOf(bead.caustic)}
    </RadialGradient>,
  ]);

type DeckLayerProps = {
  deck: DeckDraw;
  palette: SkyPalette;
  /** Whether some other deck holds the focus, so this one fades to context. */
  dimmed: boolean;
  relZoom: number;
  relZoomMax: number;
  u: number;
  /** Selected star id, gated to this deck by the parent — a primitive, so the memo survives it. */
  selected: number | null;
  /** Front-label strength, already zeroed by the parent for every deck but the focused one. */
  labelOp: number;
  /** The open session's newest star, already gated to this deck by the parent. */
  tip: Star | null;
};

/**
 * Everything one deck draws, memoised — and the memo is the pay-off of the frame cache in
 * `useSkyDraw`. During a pure pan the frame object is *reused* and every prop here is
 * reference-identical, so React skips this whole subtree and the pan reconciles nothing but the
 * `viewBox`. Anything camera-derived that sneaks in as a fresh object per frame silently undoes that.
 */
const DeckLayer = memo(function DeckLayer({
  deck,
  palette,
  dimmed,
  relZoom,
  relZoomMax,
  u,
  selected,
  labelOp,
  tip,
}: DeckLayerProps) {
  /**
   * Each visible link resolved to the paint it draws with — three cases, exactly as the web:
   * same-rank endpoints go flat (a gradient would be a solid colour that also cost a def); mixed
   * rank inside the focused deck gets a real gradient; mixed rank anywhere else takes the flat
   * midpoint, because at the outer view a strand is a couple of faint pixels under the clouds.
   *
   * `userSpaceOnUse` coordinates resolve in the space of the element referencing the gradient, and
   * both the line and the def sit inside this deck's translate — so these are the generator's own
   * local numbers and nothing is converted twice.
   */
  const { strands, gradients } = useMemo(() => {
    const ramp = strandRamps(palette.ranks);
    const gradients: React.ReactElement[] = [];
    const strands = deck.links.map((l) => {
      const from = ramp[rankOf(l.a.mastery)];
      const to = ramp[rankOf(l.b.mastery)];
      if (from === to) return { l, stroke: from };
      if (!deck.focused) return { l, stroke: lerpHex(from, to, 0.5) };
      const gid = `sky-strand-${deck.did}-${l.a.id}-${l.b.id}`;
      gradients.push(
        <LinearGradient
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
          <Stop offset={`${LINK_STRAND_HOLD * 100}%`} stopColor={from} />
          <Stop offset={`${(1 - LINK_STRAND_HOLD) * 100}%`} stopColor={to} />
        </LinearGradient>,
      );
      return { l, stroke: `url(#${gid})` };
    });
    return { strands, gradients };
  }, [deck.links, deck.did, deck.focused, palette]);

  return (
    <G transform={`translate(${deck.origin.x}, ${deck.origin.y})`} opacity={dimmed ? UNFOCUSED_DECK_OPACITY : 1}>
      {/* under everything, including the clouds: the deck's own atmosphere, which unlike every other
          soft layer here is not a stand-in for anything and so never fades out. */}
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

      {/* the reach ring belongs to the drawing, not to the cloud, so it arrives with the lines.
          Static here — the web pulses it with `.sky-open`. */}
      {tip && deck.layers.lineOp > 0 && (
        <Circle
          cx={tip.x}
          cy={tip.y}
          r={LINK_REACH}
          fill="none"
          stroke="white"
          strokeOpacity={0.3 * deck.layers.lineOp}
          strokeDasharray={[2 * u, 6 * u]}
          strokeWidth={u}
        />
      )}

      {/* Constellation strands. Solid, round-capped: the guide draws them dashed, and a dash reads as
          a hint at a link where at this weight of star the links are structure.

          The group opacity is the crossfade's line weight, which is the layer's whole zoom story: it
          ramps 0→1 inside a focused deck as the cloud thins out and is simply 1 at the outer view. */}
      <G opacity={deck.layers.lineOp}>
        {gradients.length > 0 && <Defs>{gradients}</Defs>}

        {/* the bloom: the same strands, wide and very faint, under the crisp pass — a continuous glow
            end to end rather than a halo at the joints. Focused deck only, and a plain second stroke
            rather than a blur filter. It reuses the crisp pass's paint, so the gradient is defined
            once and referenced twice. */}
        {deck.focused &&
          strands.map(({ l, stroke }) => (
            <Line
              key={`glow-${l.a.id}-${l.b.id}`}
              x1={l.a.x}
              y1={l.a.y}
              x2={l.b.x}
              y2={l.b.y}
              stroke={stroke}
              strokeOpacity={LINK_GLOW_ALPHA}
              strokeWidth={LINK_GLOW_PX * u}
              strokeLinecap="round"
            />
          ))}
        {strands.map(({ l, stroke }) => (
          <Line
            key={`${l.a.id}-${l.b.id}`}
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            stroke={stroke}
            strokeOpacity={deck.focused ? LINK_STRAND_ALPHA : LINK_STRAND_MAP_ALPHA}
            strokeWidth={(deck.focused ? LINK_STRAND_PX : LINK_STRAND_MAP_PX) * u}
            strokeLinecap="round"
          />
        ))}
      </G>

      {/* the condensed interior's real stars: budget survivors among the clouds, fading out exactly
          as the full layer beneath fades in — the survivors are in both sets, so they hand over to
          themselves without a seam */}
      {deck.preview && deck.preview.op > 0 && (
        <G opacity={deck.preview.op}>
          <SkyStars
            stars={deck.preview.stars}
            ranks={palette.ranks}
            // the empty set on purpose: the fulcral boost is for stand-ins that must be findable at
            // the outer view; here it made them out of the ordinary, and rank alone is highlight
            // enough
            fulcral={NO_FULCRAL}
            focused
            relZoom={relZoom}
            relZoomMax={relZoomMax}
            u={u}
            // no ring and no labels in the preview: it exists below the label zoom by construction,
            // and the selected star may not be among its survivors
            selected={null}
            labelOp={0}
          />
        </G>
      )}

      <G opacity={deck.layers.starOp}>
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
          selected={selected}
          labelOp={labelOp}
        />
      </G>
    </G>
  );
});

type Props = {
  frame: SkyFrame;
  layout: SkyLayout;
  /** The reader's hue preset, threaded explicitly rather than read from a module — the lib is copied
   *  between platforms and a mutable "active palette" would be invisible to React. */
  palette: SkyPalette;
  focus: FocusPath;
  cam: CameraController;
  /** The open card's star id, or null. Drawn ringed; the host's chrome shows the same card. */
  selected: number | null;
  /** Newest star of the open session, which the reach ring is drawn around. */
  openTip: Star | null;
  /** The outer view's deck card frames, already resolved to display data (SkyMap's job). */
  frames?: DeckFrameData[];
  /** Frame LOD: false draws each deck as its bare constellation with its name beneath. */
  framed?: boolean;
  /** A tap at the outer view chooses a deck rather than a star. */
  onEnterDeck: (did: number) => void;
  onStarClick: (star: Star) => void;
  /** A tap inside a focused deck that hit no star — the host reads it as "clear the selection". */
  onMiss?: () => void;
};

export function SkyCanvas({
  frame,
  layout,
  palette,
  focus,
  cam,
  selected,
  openTip,
  frames,
  framed = true,
  onEnterDeck,
  onStarClick,
  onMiss,
}: Props) {
  const { onLayout, camera, view, viewport, relZoom, relZoomMax, onPanStart, onPanMove, onPanEnd, onPinch } = cam;
  const [pressedDeck, setPressedDeck] = useState<number | null>(null); // did, outer view only
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
   * A tap means different things at different tiers, and that is the whole interaction: at the outer
   * view there are no individual cards worth aiming at, so a tap chooses a deck; inside one, the
   * stars are the subject and a tap opens a card.
   *
   * Picking runs against the stars the tier decided to draw, which does two jobs at once: it costs
   * O(what is on screen) rather than O(the sky), and a card standing inside a cloud has no star to
   * hit — no reviewing something you cannot see.
   */
  const pickAt = useCallback(
    (at: Point) => {
      if (!focusedDeck) return null;
      const world = toWorld(at, camera, viewport);
      const local = { x: world.x - focusedDeck.origin.x, y: world.y - focusedDeck.origin.y };
      const i = pickStar(focusedDeck.stars, local, camera.zoom);
      return i < 0 ? null : focusedDeck.stars[i];
    },
    [focusedDeck, camera, viewport],
  );

  const handleTap = useCallback(
    (at: Point) => {
      setPressedDeck(null);
      if (hidden) return;
      if (focusedDid === null) {
        const world = toWorld(at, camera, viewport);
        // the frame is the primary target; deckAt keeps a tap in the gutter meaningful too
        const did = deckAt(layout, world);
        if (did !== null) onEnterDeck(did);
        return;
      }
      const star = pickAt(at);
      if (star) onStarClick(star);
      else onMiss?.(); // empty sky: the tap meant "nothing", which the host reads as deselect
    },
    [hidden, focusedDid, camera, viewport, layout, onEnterDeck, pickAt, onStarClick, onMiss],
  );

  /** Press feedback at the outer view: which deck is under the finger, resolved by coordinates like
   *  everything else, so the frames carry no hit targets. */
  const handlePressIn = useCallback(
    (at: Point) => {
      if (hidden || focusedDid !== null) return;
      const world = toWorld(at, camera, viewport);
      setPressedDeck(frameAt(layout, world, framed));
    },
    [hidden, focusedDid, camera, viewport, layout, framed],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onStart((e) => onPanStart({ x: e.x, y: e.y }))
      .onUpdate((e) => {
        // the sky is moving under the finger, so a press readout would only flicker
        if (onPanMove({ x: e.x, y: e.y })) setPressedDeck(null);
      })
      .onFinalize(() => {
        onPanEnd();
      })
      .runOnJS(true);

    // `scale` is cumulative across the gesture, so each step is the ratio against the previous one —
    // which is the plain multiplier `zoomAround` wants.
    let lastScale = 1;
    const pinch = Gesture.Pinch()
      .onStart(() => {
        lastScale = 1;
        setPressedDeck(null);
      })
      .onUpdate((e) => {
        if (e.scale <= 0) return;
        const step = e.scale / lastScale;
        lastScale = e.scale;
        onPinch(step, { x: e.focalX, y: e.focalY });
      })
      .runOnJS(true);

    const tap = Gesture.Tap()
      .onBegin((e) => handlePressIn({ x: e.x, y: e.y }))
      .onEnd((e, success) => {
        if (success) handleTap({ x: e.x, y: e.y });
        else setPressedDeck(null);
      })
      .runOnJS(true);

    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [onPanStart, onPanMove, onPanEnd, onPinch, handlePressIn, handleTap]);

  return (
    /* Fills whatever box the host gives it — the camera works off `onLayout`, so the only requirement
       is that the parent has a size.

       **Transparent, deliberately** — the night behind the stars is the host's, not the canvas's, so
       a host that wants the sky in a box of its own paints the gradient on the parent. */
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout} collapsable={false}>
        <Svg width="100%" height="100%" viewBox={viewBoxOf(view)}>
          <Defs>
            {glow}
            {bead}
          </Defs>

          {/* The deck card frames, under the constellations they wrap. Outer view only: a focused
              deck wears no frame, and the dimmed context decks lose theirs with the tier. */}
          {!hidden && focusedDid === null && frames && frames.length > 0 && (
            <SkyFrames frames={frames} pressed={pressedDeck} u={u} framed={framed} />
          )}

          {/* One transform per deck, which is the whole of what the layout does to a deck's contents.
              Everything inside is in that deck's own local coordinates — the same numbers the
              generator placed and its quadtree was built from, so nothing is converted twice. */}
          {frame.decks.map((deck) => (
            <DeckLayer
              key={deck.did}
              deck={deck}
              palette={palette}
              dimmed={focusedDid !== null && !deck.focused}
              relZoom={relZoom}
              relZoomMax={relZoomMax}
              u={u}
              selected={deck.focused ? selected : null}
              labelOp={deck.focused ? labelOp : 0}
              tip={openTip && openTip.did === deck.did ? openTip : null}
            />
          ))}
        </Svg>
      </View>
    </GestureDetector>
  );
}
