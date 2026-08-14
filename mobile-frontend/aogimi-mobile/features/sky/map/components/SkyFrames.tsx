import { memo } from 'react';
import { Defs, G, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import {
  CHIP_DUE_TRACK_PX,
  CHIP_GAP_PX,
  CHIP_H_PX,
  CHIP_MARGIN_PX,
  CHIP_PAD_X_PX,
  DECK_FOG_ALPHA,
  DECK_FOG_PAD,
  FRAME_COVER_W_PX,
  FRAME_DUE_INLINE_PX,
  FRAME_DUE_PX,
  FRAME_FOOT,
  FRAME_INSET_PX,
  FRAME_NAME_PX,
  FRAME_PAD,
  FRAME_PILL_H_PX,
  FRAME_PILL_W_PX,
} from '../lib/config';
import { clip } from '../lib/cards';
import { contentBoxOf } from '../lib/layout';
import { FRAME_CHROME } from '../lib/palette';
import type { Bounds } from '../lib/types';
import { fontFamily } from '@/theme/tokens';

/**
 * **UNUSED — imported by nothing.** The `react-native-svg` original, kept on disk as the reference for
 * the frames pass: the outer tier's card frames are being rebuilt as an RN overlay above the Skia
 * canvas, not ported into it (see `SkyCanvas.tsx`'s header for why). Delete this file once that lands.
 *
 * The deck card frames of the outer view — the native port of the web's `SkyFrames.tsx`. See that
 * file for the design and, in particular, for why **type is screen px while the card is world
 * space**, and why that trade is what makes the frameless mode necessary past `FRAME_LOD_EXIT_PX`.
 *
 * ── `hovered` became `pressed` ───────────────────────────────────────────────────────────────────
 * A touch screen has no cursor, so the web's hover state has nothing to key on — but the drawing it
 * drives (the framed card's fill/stroke brighten, and the frameless deck's fog) is exactly the
 * feedback a tap wants. So the prop is kept and re-pointed: SkyCanvas sets it while a tap is down on
 * a deck and clears it when the gesture resolves. Same pixels, a different question answered.
 *
 * The web's CSS transitions on those two (`.sky-frame`, `.sky-fog`) are not ported — see the note in
 * SkyStars. The state change is instant, which for touch feedback is arguably the better behaviour
 * anyway: a press should acknowledge immediately.
 *
 * It owns no hit targets. SkyCanvas owns every gesture; the press arrives resolved by coordinates
 * (`frameAt`) and a tap resolves through `deckAt` — the layer stays pointer-transparent, so panning
 * over a frame is panning the sky.
 */

/** One frame's display data, resolved by SkyMap from the layout, the deck's own cards and the
 *  host's `frameMeta`. */
export type DeckFrameData = {
  did: number;
  /** The frame's world box, from the layout (`DeckPlace.frame`) — never recomputed here. */
  frame: Bounds;
  name: string;
  cardCount: number;
  masteredCount: number;
  /** null renders the pill dashed: the host has no due figure, which is not the same as 0. */
  dueCount: number | null;
  coverColor: string;
  coverInk: string;
  coverGlyph: string;
  subtitle: string | null;
};

/** What a frame's cover falls back to when the host supplied no meta. */
export const FALLBACK_COVER = { color: 'rgba(255, 255, 255, 0.10)', ink: '#f2f1ee' } as const;

/**
 * The app's type roles. The web states these as CSS vars with literal fallbacks; the native renderer
 * reads the same roles from `theme/tokens`, which is the equivalent seam — `lib/` is what may not
 * know about the host, and this is the renderer.
 */
const FACE_JP = fontFamily.jp;
const FACE_MONO = fontFamily.mono;

/**
 * Rough advance width of a string at a given size, in the same px the caller measures in.
 *
 * SVG gives no way to measure text without laying it out, and the label chip has to size a pill
 * *around* its text — so this estimates. Ported unchanged from the web, including the four Latin
 * width classes and the full-width CJK case: the reasoning is in that file, and the two copies must
 * agree or a deck name would truncate differently per platform.
 */
const FULL_WIDTH = /[　-ヿ㐀-䶿一-鿿豈-﫿＀-｠￠-￦]/u;

const NARROW = new Set(' ijltfrI.,:;\'"!|()[]{}·-');
const WIDE = new Set('mwMW@');
const CAPS = new Set('ABCDEFGHKLNOPQRSTUVXYZ0123456789');
const SAFETY = 1.15;

const advanceEm = (ch: string): number => {
  if (FULL_WIDTH.test(ch)) return 1;
  if (NARROW.has(ch)) return 0.28;
  if (WIDE.has(ch)) return 0.82;
  if (CAPS.has(ch)) return 0.62;
  return 0.53;
};

/** `safety` is a parameter because the two callers want the error in opposite directions — see the
 *  web copy: over-estimate when sizing the pill, under-estimate when choosing where to truncate. */
const textPx = (s: string, sizePx: number, trackingPx = 0, safety = SAFETY): number => {
  let em = 0;
  let n = 0;
  for (const ch of s) {
    em += advanceEm(ch);
    n++;
  }
  return em * sizePx * safety + Math.max(0, n - 1) * trackingPx;
};

/** The longest prefix of `s` (ellipsised) that fits `maxPx`. Measured raw — see `textPx`. */
const fitText = (s: string, sizePx: number, maxPx: number): string => {
  if (textPx(s, sizePx, 0, 1) <= maxPx) return s;
  let n = [...s].length;
  while (n > 1 && textPx(clip(s, n), sizePx, 0, 1) > maxPx) n--;
  return clip(s, Math.max(1, n));
};

type Props = {
  frames: DeckFrameData[];
  /** The deck currently under a finger, resolved by SkyCanvas's gesture handlers. */
  pressed: number | null;
  /** World units per screen px, so type can be sized in px. Changes with zoom, not with pan. */
  u: number;
  /** False past FRAME_LOD_EXIT_PX: bare constellations with names beneath. */
  framed: boolean;
};

export const SkyFrames = memo(function SkyFrames({ frames, pressed, u, framed }: Props) {
  return (
    <G pointerEvents="none">
      {/* One def, not one per deck: only ever a single deck is pressed, and the gradient is in
          objectBoundingBox units so the same one fits every box it is painted into. */}
      <Defs>
        <RadialGradient id="sky-deck-fog">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity={DECK_FOG_ALPHA} />
          <Stop offset="55%" stopColor="#ffffff" stopOpacity={DECK_FOG_ALPHA * 0.45} />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        {/* The label chip's specular edge — `--glass-vl` from the web's glass.css, bright at both
            extremities and gone through the middle. Vertical, so `y2="1"`. */}
        <LinearGradient id="sky-chip-edge" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={FRAME_CHROME.chipEdgeTop} />
          <Stop offset="50%" stopColor={FRAME_CHROME.chipEdgeMid} />
          <Stop offset="100%" stopColor={FRAME_CHROME.chipEdgeBottom} />
        </LinearGradient>
      </Defs>
      {frames.map((f) =>
        framed ? (
          <FramedCard key={f.did} f={f} on={pressed === f.did} u={u} />
        ) : (
          <BareDeck key={f.did} f={f} on={pressed === f.did} u={u} />
        ),
      )}
    </G>
  );
});

/* ── framed: the full glass card ─────────────────────────────────────────── */

function FramedCard({ f, on, u }: { f: DeckFrameData; on: boolean; u: number }) {
  const b = f.frame;
  // every typographic measure in one place, so the header block scales as one object
  const inset = FRAME_INSET_PX * u;
  const coverW = FRAME_COVER_W_PX * u;
  const pillW = FRAME_PILL_W_PX * u;
  const pillH = FRAME_PILL_H_PX * u;
  return (
    <G>
      <Rect
        x={b.minX}
        y={b.minY}
        width={b.maxX - b.minX}
        height={b.maxY - b.minY}
        rx={32}
        fill={on ? FRAME_CHROME.fillHover : FRAME_CHROME.fill}
        stroke={on ? FRAME_CHROME.bdHover : FRAME_CHROME.bd}
        strokeWidth={1.1 * u}
      />

      <SvgText
        x={b.minX + inset + coverW + inset * 0.7}
        y={b.minY + inset + FRAME_NAME_PX * u}
        fill={FRAME_CHROME.deckLabel}
        opacity={on ? 1 : 0.88}
        fontFamily={FACE_JP}
        fontSize={FRAME_NAME_PX * u}
        fontWeight={700}
      >
        {f.name}
      </SvgText>

      <SvgText
        x={b.maxX - inset - pillW / 2}
        y={b.maxY - inset - pillH / 2}
        textAnchor="middle"
        alignmentBaseline="central"
        fill={FRAME_CHROME.gold}
        fontFamily={FACE_MONO}
        fontSize={FRAME_DUE_PX * u}
        fontWeight={700}
        letterSpacing={1.4 * u}
      >
        {f.dueCount === null ? '— DUE' : `${f.dueCount} DUE`}
      </SvgText>
    </G>
  );
}

/* ── frameless: the constellation, its name, and the one figure that can't wait ── */

/**
 * No card, no cover, no counts — the deck reads as what it is, a group of stars, with its name under
 * it. **Everything sits on one line**, which is a fitting constraint rather than a style choice: see
 * the web copy for the arithmetic on the room the framed layout reserves there.
 */
function BareDeck({ f, on, u }: { f: DeckFrameData; on: boolean; u: number }) {
  const b = f.frame;
  const cx = (b.minX + b.maxX) / 2;
  // centred in the room below the stars: half of the pad + footer the framed cell already holds
  const y = b.maxY - (FRAME_PAD + FRAME_FOOT) / 2;
  const due = f.dueCount !== null && f.dueCount > 0 ? f.dueCount : null;
  // the fog covers exactly the press region (`contentBoxOf`), grown by a soft margin
  const fog = contentBoxOf(b, false);

  /* Fit the chip's contents to the cell, in screen px, then size the pill to what survived. Two
     steps of degradation rather than one, because the due figure must not be what gets cut. */
  const availPx = (b.maxX - b.minX) / u - 2 * CHIP_MARGIN_PX - 2 * CHIP_PAD_X_PX;
  let dueText = due === null ? null : `${due} DUE`;
  let duePx = dueText ? textPx(dueText, FRAME_DUE_INLINE_PX, CHIP_DUE_TRACK_PX) : 0;
  if (dueText && availPx - duePx - CHIP_GAP_PX < FRAME_NAME_PX * 3) {
    dueText = String(due);
    duePx = textPx(dueText, FRAME_DUE_INLINE_PX, CHIP_DUE_TRACK_PX);
  }
  const name = fitText(f.name, FRAME_NAME_PX, availPx - (dueText ? duePx + CHIP_GAP_PX : 0));
  const namePx = textPx(name, FRAME_NAME_PX);

  const contentPx = namePx + (dueText ? CHIP_GAP_PX + duePx : 0);
  // Clamped to the deck's own width less its margins, so the safe over-estimate can never push two
  // neighbours' pills into each other across the grid gutter.
  const chipW = Math.min(contentPx + 2 * CHIP_PAD_X_PX, (b.maxX - b.minX) / u - 2 * CHIP_MARGIN_PX) * u;
  const chipH = CHIP_H_PX * u;
  const chipX = cx - chipW / 2;
  const nameX = chipX + CHIP_PAD_X_PX * u;
  // right-aligned to the pill's inner edge, not laid out after the name — see `textPx`
  const dueX = chipX + chipW - CHIP_PAD_X_PX * u;

  return (
    <G>
      {/* Always mounted, faded by opacity rather than mounted on press — one fewer mount/unmount on
          the layer a finger is dragging across. */}
      <Rect
        x={fog.minX - DECK_FOG_PAD}
        y={fog.minY - DECK_FOG_PAD}
        width={fog.maxX - fog.minX + 2 * DECK_FOG_PAD}
        height={fog.maxY - fog.minY + 2 * DECK_FOG_PAD}
        rx={44}
        fill="url(#sky-deck-fog)"
        opacity={on ? 1 : 0}
      />
      {/* the pill: glass fill, then the specular edge over it as its own stroked rect so the two can
          carry different gradients — `--glass-fill` is flat, `--glass-vl` is not */}
      <Rect x={chipX} y={y - chipH / 2} width={chipW} height={chipH} rx={chipH / 2} fill={FRAME_CHROME.chipFill} />
      <Rect
        x={chipX}
        y={y - chipH / 2}
        width={chipW}
        height={chipH}
        rx={chipH / 2}
        fill="none"
        stroke="url(#sky-chip-edge)"
        strokeWidth={1.1 * u}
      />

      {/* Two text runs at computed positions rather than tspans in one centred run: the pill has to
          be sized around the content anyway, so the widths are already known. */}
      <SvgText
        x={nameX}
        y={y}
        alignmentBaseline="central"
        fill={FRAME_CHROME.deckLabel}
        opacity={on ? 1 : 0.9}
        fontFamily={FACE_JP}
        fontSize={FRAME_NAME_PX * u}
        fontWeight={700}
      >
        {name}
      </SvgText>
      {dueText && (
        <SvgText
          x={dueX}
          y={y}
          textAnchor="end"
          alignmentBaseline="central"
          fill={FRAME_CHROME.gold}
          fontFamily={FACE_MONO}
          fontSize={FRAME_DUE_INLINE_PX * u}
          fontWeight={700}
          letterSpacing={CHIP_DUE_TRACK_PX * u}
        >
          {dueText}
        </SvgText>
      )}
    </G>
  );
}
