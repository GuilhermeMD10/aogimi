'use client';
import { memo } from 'react';

import { FRAME_FOOT, FRAME_HEAD } from '../lib/config';
import { FRAME_CHROME, STAR_LABEL_COLOR } from '../lib/palette';
import type { Bounds } from '../lib/types';

/**
 * The deck card frames of the outer view — the handover's key new element: every constellation
 * wrapped in a rounded glass card with a header (cover tile, deck name, subtitle) and a footer
 * (card/mastered counts, a gold due pill).
 *
 * Drawn in **world space** on purpose, so a frame pans and zooms with the sky it frames: the
 * bands and text are world-sized like the constellation is, while the strokes are non-scaling —
 * ~1 screen px at every zoom, the prototype's divide-by-camera-scale. Nothing here reads the
 * camera at all, which is what lets the whole layer sit outside the per-frame work: it re-renders
 * on data, hover, nothing else.
 *
 * It also owns no hit targets. SkyCanvas owns every gesture; hover arrives resolved by
 * coordinates (`frameAt`) and a click resolves through `deckAt` — the layer stays
 * pointer-transparent, so panning over a frame is panning the sky.
 *
 * Interior geometry (insets, tile size, font sizes) is the handover's frame spec verbatim, in
 * world units; it is not tunable the way config.ts constants are, so it stays literal here.
 */

/** One frame's display data, resolved by SkyMap from the layout, the deck's own cards and the
 *  host's `frameMeta` — see `SkyFrameMeta` there for what degrades to what. */
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

/** What a frame's cover falls back to when the host supplied no meta: a neutral glass tile
 *  lettered with the deck name's first character, in the frames' own light-on-night chrome. */
export const FALLBACK_COVER = { color: 'rgba(255, 255, 255, 0.10)', ink: '#f2f1ee' } as const;

/** The app's type tokens, with the same faces as literal fallback so the canvas still renders in
 *  a host without them — the no-host-CSS rule binds `lib/`, and this is the web renderer. */
const FACE_JP = "var(--face-jp, 'M PLUS 1', sans-serif)";
const FACE_MONO = "var(--face-mono, 'Space Mono', monospace)";

/** Due pill footprint (world units), shared by the rect and the text centred in it. */
const PILL_W = 148;
const PILL_H = 54;

type Props = {
  frames: DeckFrameData[];
  /** Hovered deck did, resolved by SkyCanvas's pointer handlers — never by DOM hit-testing here. */
  hovered: number | null;
};

export const SkyFrames = memo(function SkyFrames({ frames, hovered }: Props) {
  return (
    <g pointerEvents="none">
      {frames.map((f) => {
        const hov = hovered === f.did;
        const b = f.frame;
        const fy = b.maxY - FRAME_FOOT; // top of the footer band
        return (
          <g key={f.did}>
            {/* the card. sky-frame carries the hover transition (fill/stroke only — neither is
                zoom-driven), and prefers-reduced-motion turns it off with the rest */}
            <rect
              className="sky-frame"
              x={b.minX}
              y={b.minY}
              width={b.maxX - b.minX}
              height={b.maxY - b.minY}
              rx={32}
              fill={hov ? FRAME_CHROME.fillHover : FRAME_CHROME.fill}
              stroke={hov ? FRAME_CHROME.bdHover : FRAME_CHROME.bd}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
            />

            {/* header: cover tile + glyph, deck name, subtitle */}
            <rect x={b.minX + 30} y={b.minY + 32} width={52} height={70} rx={7} fill={f.coverColor} />
            <text
              x={b.minX + 56}
              y={b.minY + 76}
              textAnchor="middle"
              fill={f.coverInk}
              fontFamily={FACE_JP}
              fontSize={30}
            >
              {f.coverGlyph}
            </text>
            <text
              x={b.minX + 100}
              y={b.minY + 68}
              fill={FRAME_CHROME.deckLabel}
              opacity={hov ? 1 : 0.88}
              fontFamily={FACE_JP}
              fontSize={42}
              fontWeight={700}
            >
              {f.name}
            </text>
            {f.subtitle && (
              <text
                x={b.minX + 102}
                y={b.minY + 97}
                fill={STAR_LABEL_COLOR}
                opacity={0.62}
                fontFamily={FACE_MONO}
                fontSize={19}
                letterSpacing={2}
              >
                {f.subtitle}
              </text>
            )}

            {/* footer: counts on the left, the due pill on the right */}
            <text
              x={b.minX + 30}
              y={fy + 44}
              fill={STAR_LABEL_COLOR}
              opacity={0.8}
              fontFamily={FACE_MONO}
              fontSize={22}
              letterSpacing={1.4}
            >
              {f.cardCount} {f.cardCount === 1 ? 'CARD' : 'CARDS'}
            </text>
            <text
              x={b.minX + 30}
              y={fy + 74}
              fill={STAR_LABEL_COLOR}
              opacity={0.5}
              fontFamily={FACE_MONO}
              fontSize={19}
              letterSpacing={1.2}
            >
              {f.masteredCount} mastered
            </text>
            <rect
              x={b.maxX - 30 - PILL_W}
              y={fy + 26}
              width={PILL_W}
              height={PILL_H}
              rx={PILL_H / 2}
              fill={FRAME_CHROME.goldFill}
              stroke={FRAME_CHROME.goldBd}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={b.maxX - 30 - PILL_W / 2}
              y={fy + 26 + PILL_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill={FRAME_CHROME.gold}
              fontFamily={FACE_MONO}
              fontSize={22}
              fontWeight={700}
              letterSpacing={1.4}
            >
              {f.dueCount === null ? '— DUE' : `${f.dueCount} DUE`}
            </text>
          </g>
        );
      })}
    </g>
  );
});
