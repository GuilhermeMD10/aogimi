import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Canvas,
  Group,
  Line,
  LinearGradient,
  Text,
  useFont,
  vec,
  type SkFont,
  type Transforms3d,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { NO_FULCRAL } from '../lib/cluster';
import {
  LABEL_BAND,
  LABEL_MIN_PX,
  LABEL_WORLD_PX,
  LABEL_ZOOM,
  LINK_GLOW_ALPHA,
  LINK_GLOW_PX,
  LINK_STRAND_ALPHA,
  LINK_STRAND_HOLD,
  LINK_STRAND_MAP_ALPHA,
  LINK_STRAND_MAP_PX,
  LINK_STRAND_PX,
  UNFOCUSED_DECK_OPACITY,
} from '../lib/config';
import { deckAt, type SkyLayout } from '../lib/layout';
import { starTapFeedback } from '@/lib/haptics';
import { labelOpAt } from '../lib/lod';
import { STAR_LABEL_COLOR, type SkyPalette, lerpHex, rankOf, strandRamps } from '../lib/palette';
import { pickStar } from '../lib/picking';
import type { DeckDraw, SkyFrame } from '../lib/tiers';
import type { FocusPath, Point, Star } from '../lib/types';
import type { SkyCameraController } from '../hooks/useSkyCamera';
import { COMMIT_ZOOM_RATIO } from '../native/gestureConfig';

import { SkyClouds } from './SkyClouds';
import { type BeadPaints, beadPaints, glowPaints } from './SkyPaints';
import { LABEL_FONT_SIZE, SkyStars, type StarLabelLive } from './SkyStars';
import { SkyWash } from './SkyWash';

/**
 * The renderer host, and the one place gestures live — now a Skia canvas rather than an SVG tree.
 *
 * ── What replaced what ───────────────────────────────────────────────────────────────────────────
 *   `<Svg viewBox>` re-rendered per frame  →  one `<Group transform>` off shared values
 *   a React-state camera + `runOnJS(true)` →  `hooks/useSkyCamera.ts`, live pose on the UI thread
 *   `<Defs>` + `fill="url(#id)"`           →  shared `SkPaint`s (see `SkyPaints.ts`)
 *   Fabric shadow node per SVG element     →  Skia's own scene graph, painted off the JS thread
 *
 * **The camera never re-renders this component.** The world is drawn in world coordinates and the
 * camera is a matrix on the group above it, fed by `camX`/`camY`/`camZoom`. So a pan is one transform
 * update on the UI thread: no React render, no reconcile, no repaint of anything below. A pinch is the
 * same until the committed zoom drifts far enough that the LOD has to catch up — see
 * `COMMIT_ZOOM_RATIO` in `native/gestureConfig.ts`.
 *
 * **Text is sized off the live pose, not the committed one.** Everything else in the picture is
 * built in world units from the committed camera and rides the matrix between commits — a star
 * swells a few percent mid-pinch and snaps back, which at 3px is invisible. A 20px word doing the
 * same is not: it read as the labels pulsing, and their fade-in stepped by a quarter at a time. So
 * the label scales and the label fade below are derived values on the UI thread, the same place the
 * camera lives: a word holds its screen size and fades continuously through the whole pinch. It is
 * the web's per-wheel-event `fontSize={… * u}` / `labelOpAt(zoom)` behaviour, without the render.
 * What React still decides is whether a label is *mounted* — see `labelsMounted`.
 *
 * ── The gesture tree ────────────────────────────────────────────────────────────────────────────
 * Pan, pinch and double-tap are built by the camera hook and run entirely in worklets. This component
 * adds only the **tap**, because a tap means picking and picking is JS-side: it walks the frame's stars
 * through the quadtree. `Gesture.Race` puts the tap behind the pan/pinch pair, so a drag never also
 * selects.
 *
 * Picking resolves against the **live** pose (`toWorldLive`), not the committed one — a tap landing
 * mid-fling must hit what is under the finger, not what was under it at the last commit.
 *
 * ── Deck frames are not drawn in this pass ───────────────────────────────────────────────────────
 * The outer tier currently draws each deck as its **bare constellation with its name beneath**, which
 * is the `framed={false}` mode the layout already supports (`framedAt`) rather than a stub. The card
 * frames — cover tile, counts, due pill — are next, and belong in an RN overlay above the canvas
 * rather than in it: they are chrome with real text, and the app's fonts, i18n and press feedback are
 * all better served by views than by Skia text.
 */

/** The world rectangle → screen transform, as SVG's transform list read left to right. */
const worldTransform = (
  vw: number,
  vh: number,
  camX: number,
  camY: number,
  zoom: number,
): Transforms3d => {
  'worklet';
  return [
    { translateX: vw / 2 },
    { translateY: vh / 2 },
    { scale: zoom },
    { translateX: -camX },
    { translateY: -camY },
  ];
};

type DeckLayerProps = {
  deck: DeckDraw;
  palette: SkyPalette;
  glow: ReturnType<typeof glowPaints>;
  bead: readonly BeadPaints[];
  /** Whether some other deck holds the focus, so this one fades to context. */
  dimmed: boolean;
  relZoom: number;
  relZoomMax: number;
  u: number;
  /** Selected star id, gated to this deck by the parent — a primitive, so the memo survives it. */
  selected: number | null;
  /** Whether front labels are mounted, already false for every deck but the focused one. */
  labelled: boolean;
  font: SkFont | null;
  /** The star labels' live scale and fade — see `SkyStars`. Reference-stable, so the memo survives it. */
  labels: StarLabelLive;
};

/**
 * Everything one deck draws, memoised. The pay-off is the frame cache in `useSkyDraw`: during a pure
 * pan the frame object is *reused* and every prop here is reference-identical, so React skips this
 * subtree entirely — and since the camera lives above in a transform, a pan does not even reach React.
 * Anything camera-derived that sneaks in as a fresh object per commit silently undoes that.
 */
const DeckLayer = memo(function DeckLayer({
  deck,
  palette,
  glow,
  bead,
  dimmed,
  relZoom,
  relZoomMax,
  u,
  selected,
  labelled,
  font,
  labels,
}: DeckLayerProps) {
  /**
   * Each visible link resolved to how it is painted — three cases, exactly as before: same-rank
   * endpoints go flat (a gradient would be a solid colour that also cost a shader); mixed rank inside
   * the focused deck gets a real gradient; mixed rank anywhere else takes the flat midpoint, because
   * at the outer view a strand is a couple of faint pixels under the clouds.
   */
  const strands = useMemo(() => {
    const ramp = strandRamps(palette.ranks);
    return deck.links.map((l) => {
      const from = ramp[rankOf(l.a.mastery)];
      const to = ramp[rankOf(l.b.mastery)];
      if (from === to) return { l, flat: from, grad: null };
      if (!deck.focused) return { l, flat: lerpHex(from, to, 0.5), grad: null };
      return { l, flat: null, grad: { from, to } };
    });
  }, [deck.links, deck.focused, palette]);

  const strandWidth = (deck.focused ? LINK_STRAND_PX : LINK_STRAND_MAP_PX) * u;
  const strandAlpha = deck.focused ? LINK_STRAND_ALPHA : LINK_STRAND_MAP_ALPHA;

  return (
    <Group
      opacity={dimmed ? UNFOCUSED_DECK_OPACITY : 1}
      transform={[{ translateX: deck.origin.x }, { translateY: deck.origin.y }]}
    >
      {/* Under everything, including the clouds: the deck's own atmosphere, which unlike every other
          soft layer here is not a stand-in for anything and so never fades out. */}
      {deck.wash && <SkyWash root={deck.wash} />}

      {(deck.lobes.length > 0 || deck.halos.length > 0) && (
        <SkyClouds
          halos={deck.halos}
          lobes={deck.lobes}
          edges={deck.edges}
          opacity={deck.layers.cloudOp}
          u={u}
          mass={deck.mass}
        />
      )}

      {/* Constellation strands. Solid, round-capped: dashes read as a hint at a link, where at this
          weight of star the links are structure.

          The group opacity is the crossfade's line weight, which is the layer's whole zoom story: it
          ramps 0→1 inside a focused deck as the cloud thins out and is simply 1 at the outer view. */}
      <Group opacity={deck.layers.lineOp}>
        {/* The bloom: the same strands, wide and very faint, under the crisp pass — a continuous glow
            end to end rather than a halo at the joints. Focused deck only, and a plain second stroke
            rather than a blur, which at this width would cost a layer per deck. */}
        {deck.focused &&
          strands.map(({ l, flat, grad }) => (
            <Line
              key={`glow-${l.a.id}-${l.b.id}`}
              p1={vec(l.a.x, l.a.y)}
              p2={vec(l.b.x, l.b.y)}
              color={flat ?? undefined}
              style="stroke"
              strokeWidth={LINK_GLOW_PX * u}
              strokeCap="round"
              opacity={LINK_GLOW_ALPHA}
            >
              {grad && (
                <LinearGradient
                  start={vec(l.a.x, l.a.y)}
                  end={vec(l.b.x, l.b.y)}
                  colors={[grad.from, grad.to]}
                  positions={[LINK_STRAND_HOLD, 1 - LINK_STRAND_HOLD]}
                />
              )}
            </Line>
          ))}
        {strands.map(({ l, flat, grad }) => (
          <Line
            key={`${l.a.id}-${l.b.id}`}
            p1={vec(l.a.x, l.a.y)}
            p2={vec(l.b.x, l.b.y)}
            color={flat ?? undefined}
            style="stroke"
            strokeWidth={strandWidth}
            strokeCap="round"
            opacity={strandAlpha}
          >
            {grad && (
              <LinearGradient
                start={vec(l.a.x, l.a.y)}
                end={vec(l.b.x, l.b.y)}
                colors={[grad.from, grad.to]}
                positions={[LINK_STRAND_HOLD, 1 - LINK_STRAND_HOLD]}
              />
            )}
          </Line>
        ))}
      </Group>

      {/* The condensed interior's real stars: budget survivors among the clouds, fading out exactly as
          the full layer beneath fades in — the survivors are in both sets, so they hand over to
          themselves without a seam. */}
      {deck.preview && deck.preview.op > 0 && (
        <Group opacity={deck.preview.op}>
          <SkyStars
            stars={deck.preview.stars}
            ranks={palette.ranks}
            glowPaints={glow}
            beadPaints={bead}
            // The empty set on purpose: the fulcral boost is for stand-ins that must be findable at
            // the outer view; here it made them out of the ordinary, and rank alone is highlight
            // enough.
            fulcral={NO_FULCRAL}
            focused
            relZoom={relZoom}
            relZoomMax={relZoomMax}
            u={u}
            // No ring and no labels in the preview: it exists below the label zoom by construction,
            // and the selected star may not be among its survivors.
            selected={null}
            labelled={false}
            font={null}
            labels={labels}
          />
        </Group>
      )}

      <Group opacity={deck.layers.starOp}>
        <SkyStars
          stars={deck.stars}
          ranks={palette.ranks}
          glowPaints={glow}
          beadPaints={bead}
          fulcral={deck.fulcral}
          focused={deck.focused}
          starScale={deck.starScale}
          vivid={deck.vivid}
          relZoom={relZoom}
          relZoomMax={relZoomMax}
          u={u}
          selected={selected}
          labelled={labelled}
          font={font}
          labels={labels}
        />
      </Group>
    </Group>
  );
});

type Props = {
  frame: SkyFrame;
  layout: SkyLayout;
  /** The reader's hue preset, threaded explicitly rather than read from a module — the lib is copied
   *  between platforms and a mutable "active palette" would be invisible to React. */
  palette: SkyPalette;
  focus: FocusPath;
  cam: SkyCameraController;
  /** Deck names by did, for the outer tier's labels. They live on the sky **index**, not the layout —
   *  `layoutDecks` only reads them to size a frame and does not keep them. */
  names: ReadonlyMap<number, string>;
  /** The open card's star id, or null. Drawn ringed; the host's chrome shows the same card. */
  selected: number | null;
  /** Newest star of the open session. Reserved for the reach ring, which is not drawn in this pass —
   *  it was static in the SVG copy (the web pulses it with `.sky-open`) and belongs with the frames
   *  pass, where it can be a real animation for once. */
  openTip: Star | null;
  /** A tap at the outer view chooses a deck rather than a star. */
  onEnterDeck: (did: number) => void;
  onStarClick: (star: Star) => void;
  /** A tap inside a focused deck that hit no star — the host reads it as "clear the selection". */
  onMiss?: () => void;
};

/** The label face. Japanese card fronts, so Noto Sans JP — the same `.ttf` `expo-font` already
 *  registers for the RN text layer, required straight from the package rather than copied into
 *  `assets/`. Built once at the design size; the star layer scales it by `u`. */
const LABEL_TYPEFACE = require('@expo-google-fonts/noto-sans-jp/500Medium/NotoSansJP_500Medium.ttf');

export function SkyCanvas({
  frame,
  layout,
  palette,
  focus,
  cam,
  names,
  selected,
  openTip: _openTip,
  onEnterDeck,
  onStarClick,
  onMiss,
}: Props) {
  const {
    camX, camY, camZoom, liveWorldPerPx, view, viewport, relZoom, relZoomMax,
    panZoomGesture, toWorldLive, onLayout, measured,
  } = cam;

  // Nothing is drawn until the view has been measured. The first render runs against the camera's
  // fallback viewport, and painting the sky at that scale for one frame is a flicker in its own right —
  // the stars would land, then move as the real size arrived.
  const hidden = frame.phase === 'hidden' || !measured;
  const u = view.worldPerPx;
  const focusedDid = focus.length ? focus[0] : null;
  const focusedDeck = frame.decks.find((d) => d.focused) ?? null;
  // Whether the focused deck's labels exist. The fade itself is live (`starLabelOp` below), so this only
  // has to be true before the live zoom can have faded anything in — and between commits the live
  // zoom sits within one COMMIT_ZOOM_RATIO of the committed one, so the gate is read that far ahead.
  // Without the lookahead a label would mount at the next commit already a quarter faded in.
  const labelsMounted = labelOpAt(cam.camera.zoom * COMMIT_ZOOM_RATIO) > 0;

  // Per palette, not per commit: nothing camera-derived reaches either of them.
  const glow = useMemo(() => glowPaints(palette.ranks), [palette]);
  const bead = useMemo(() => beadPaints(palette.ranks), [palette]);

  const font = useFont(LABEL_TYPEFACE, LABEL_FONT_SIZE);

  /** The camera, as the one animated value in the tree. */
  const transform = useDerivedValue(() =>
    worldTransform(viewport.width, viewport.height, camX.value, camY.value, camZoom.value),
  );

  /**
   * The text's live values — see the header. Each restates a lib function to the letter, because a
   * worklet cannot call into the lib (the same reason `native/cameraWorklet.ts` mirrors the clamp
   * rather than importing it):
   *
   *   star scale   `labelWorldSize`: max(LABEL_WORLD_PX, LABEL_MIN_PX / zoom) / LABEL_FONT_SIZE —
   *                the floor holds a readable word where labels appear, the slope grows 1:1 with
   *                the camera
   *   star fade    `labelOpAt`: 0 at LABEL_HIDE_ZOOM, 1 at LABEL_ZOOM, log space
   *   deck names   1 / zoom — a fixed screen size at the chooser and through the flight in or out
   */
  const starLabelScale = useDerivedValue<Transforms3d>(() => {
    const g = Math.max(LABEL_WORLD_PX, LABEL_MIN_PX / camZoom.value) / LABEL_FONT_SIZE;
    return [{ scaleX: g }, { scaleY: g }];
  });
  const starLabelOp = useDerivedValue(() => {
    const t = Math.log(camZoom.value / LABEL_ZOOM) / Math.log(LABEL_BAND) + 1;
    return t < 0 ? 0 : t > 1 ? 1 : t;
  });
  const starLabels = useMemo<StarLabelLive>(
    () => ({ scale: starLabelScale, op: starLabelOp }),
    [starLabelScale, starLabelOp],
  );
  const deckLabelScale = useDerivedValue<Transforms3d>(() => [
    { scaleX: liveWorldPerPx.value },
    { scaleY: liveWorldPerPx.value },
  ]);

  /**
   * A tap means different things at different tiers, and that is the whole interaction: at the outer
   * view there are no individual cards worth aiming at, so a tap chooses a deck; inside one, the stars
   * are the subject and a tap opens a card.
   *
   * Picking runs against the stars the tier decided to draw, which does two jobs at once: it costs
   * O(what is on screen) rather than O(the sky), and a card standing inside a cloud has no star to hit
   * — no reviewing something you cannot see.
   */
  const handleTap = useCallback(
    (at: Point) => {
      if (hidden) return;
      const world = toWorldLive(at);
      if (focusedDid === null) {
        const did = deckAt(layout, world);
        if (did !== null) onEnterDeck(did);
        return;
      }
      if (!focusedDeck) return;
      const local = { x: world.x - focusedDeck.origin.x, y: world.y - focusedDeck.origin.y };
      const i = pickStar(focusedDeck.stars, local, cam.camera.zoom);
      if (i >= 0) {
        // Fired here rather than by the host: this is the only place that knows
        // a star was *hit*, and the canvas is not a Touchable so nothing else
        // answers the tap. A miss stays silent — see starTapFeedback.
        starTapFeedback();
        onStarClick(focusedDeck.stars[i]);
      } else {
        onMiss?.(); // empty sky: the tap meant "nothing", which the host reads as deselect
      }
    },
    [hidden, focusedDid, focusedDeck, layout, toWorldLive, cam.camera.zoom, onEnterDeck, onStarClick, onMiss],
  );

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .numberOfTaps(1)
      .onEnd((e, success) => {
        if (success) handleTap({ x: e.x, y: e.y });
      })
      // Picking is JS-side, so this one recogniser genuinely needs the thread hop the others avoid.
      .runOnJS(true);
    return Gesture.Race(panZoomGesture, tap);
  }, [panZoomGesture, handleTap]);

  /** The outer tier's deck names, beneath each constellation. `framed={false}`'s half of the layout's
   *  two modes; the card frames come with the overlay pass. Per layout, not per commit: the anchor
   *  is the cell's centre in world units and the centring offset is in design px inside the scaled
   *  group, so nothing here depends on the camera. */
  const deckLabels = useMemo(() => {
    if (focusedDid !== null || !font) return [];
    const out: { did: number; name: string; x: number; y: number; halfWidth: number }[] = [];
    for (const [did, place] of layout.places) {
      const name = names.get(did);
      if (!name) continue;
      out.push({
        did,
        name,
        x: (place.frame.minX + place.frame.maxX) / 2,
        y: place.frame.maxY,
        halfWidth: font.measureText(name).width / 2,
      });
    }
    return out;
  }, [focusedDid, font, layout, names]);

  return (
    /* Fills whatever box the host gives it — the camera works off `onLayout`, so the only requirement
       is that the parent has a size.

       **Transparent, deliberately** — the night behind the stars is the host's, not the canvas's, so a
       host that wants the sky in a box of its own paints the gradient on the parent. */
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout} collapsable={false}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={transform}>
            {/* One transform per deck, which is the whole of what the layout does to a deck's
                contents. Everything inside is in that deck's own local coordinates — the same numbers
                the generator placed and its quadtree was built from, so nothing is converted twice. */}
            {!hidden &&
              frame.decks.map((deck) => (
                <DeckLayer
                  key={deck.did}
                  deck={deck}
                  palette={palette}
                  glow={glow}
                  bead={bead}
                  dimmed={focusedDid !== null && !deck.focused}
                  relZoom={relZoom}
                  relZoomMax={relZoomMax}
                  u={u}
                  selected={deck.focused ? selected : null}
                  labelled={deck.focused && labelsMounted}
                  font={font}
                  labels={starLabels}
                />
              ))}

            {!hidden &&
              deckLabels.map(({ did, name, x, y, halfWidth }) => (
                <Group key={did} opacity={0.7} transform={[{ translateX: x }, { translateY: y }]}>
                  <Group transform={deckLabelScale}>
                    <Text x={-halfWidth} y={0} text={name} font={font} color={STAR_LABEL_COLOR} />
                  </Group>
                </Group>
              ))}
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}
