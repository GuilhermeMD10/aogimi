'use client';
import { memo } from 'react';

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

/**
 * The deck card frames of the outer view — the handover's key new element: every constellation
 * wrapped in a rounded glass card with a header (cover tile, deck name, subtitle) and a footer
 * (card/mastered counts, a gold due pill).
 *
 * **Type is screen px; the card is world space.** The card, its bands and its radius are world-sized
 * so a frame pans and zooms with the sky it frames, and the strokes are non-scaling. Everything
 * *typographic* goes through `u` instead — the same currency every star radius and label already
 * uses. It used to be world units, which meant a frame's text shrank with the sky and left the deck
 * name at 6.8px on a laptop at twenty decks. See FRAME_NAME_PX.
 *
 * That trade is what makes the second mode necessary. World-space text always fits its card because
 * it shrinks with it; screen-space text stays readable and eventually does not fit. So past
 * FRAME_LOD_EXIT_PX the card is not drawn at all: `framed === false` renders the bare constellation
 * with its name beneath it and a small due marker, and the layout gives back the header and footer
 * bands it was reserving (`frameBoxOf`). Nothing is lost that entering the deck does not show —
 * except the due count, which is the one figure whose whole value is being visible from *outside*
 * the deck, so it stays.
 *
 * Reading `u` costs this layer its old "re-renders on data and hover, nothing else" property: it now
 * re-renders on zoom too. Not on pan — `u` is a function of zoom alone, exactly as it is for
 * `SkyStars` — so the pure-pan path this canvas is built around is untouched.
 *
 * It owns no hit targets. SkyCanvas owns every gesture; hover arrives resolved by coordinates
 * (`frameAt`, which tests the same box in both modes) and a click resolves through `deckAt` — the
 * layer stays pointer-transparent, so panning over a frame is panning the sky.
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

/**
 * Rough advance width of a string at a given size, in the same px the caller measures in.
 *
 * SVG gives no way to measure text without laying it out, and the label chip has to size a pill
 * *around* its text — so this estimates. Two glyph classes, because one ratio genuinely cannot serve
 * both: a full-width Japanese character advances about a full em where Latin averages a little over
 * half. A single divisor either overflows every Japanese deck name or leaves every Latin one
 * swimming, and this app has both.
 *
 * Within Latin a single average does not survive contact either: at one ratio "Onomatopoeia"
 * (0.54em/char) overflows its pill, at another "Kanji Radicals" (0.44em/char) loses two characters for
 * no reason — and they are the same length. So Latin glyphs go into four width classes, which brings
 * the error to a few percent: enough that a pill fits its text and the text is not cut early.
 * Full-width CJK stays the exact case at one em, which matters most here since this app's deck names
 * are as likely to be Japanese as Latin.
 *
 * `SAFETY` covers two things at once. The class widths above are regular-weight figures while every
 * string this measures renders at `fontWeight 700`, which runs about 8% wider — and then a margin on
 * top of that, because the direction of the error is not symmetric: over-estimating costs a slightly
 * roomy pill, under-estimating puts the due count on top of the name. The due text is *also* anchored
 * to the pill's own inner edge rather than laid out after the name, so an error cannot accumulate
 * across the two.
 */
const FULL_WIDTH = /[　-ヿ㐀-䶿一-鿿豈-﫿＀-｠￠-￦]/u;

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

/**
 * `safety` is a parameter rather than baked in because the two callers want the error to fall in
 * opposite directions, and one constant cannot serve both:
 *
 *   sizing the pill      over-estimate — a roomy pill is invisible, a tight one collides
 *   choosing where to    under-estimate — the margin here is paid in *characters of the deck name*,
 *   truncate             which is the one thing on the label worth protecting
 *
 * Same measurement, two tolerances. Truncating on the raw figure and drawing the box on the safe one
 * is what lets a name keep every character it can actually fit while the box around it still cannot
 * be too small.
 */
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
  /** Hovered deck did, resolved by SkyCanvas's pointer handlers — never by DOM hit-testing here. */
  hovered: number | null;
  /** World units per screen px, so type can be sized in px. Changes with zoom, not with pan. */
  u: number;
  /** False past FRAME_LOD_EXIT_PX: bare constellations with names beneath. */
  framed: boolean;
};

export const SkyFrames = memo(function SkyFrames({ frames, hovered, u, framed }: Props) {
  return (
    <g pointerEvents="none">
      {/* One def, not one per deck: only ever a single deck is hovered, and the gradient is in
          objectBoundingBox units so the same one fits every box it is painted into. */}
      <defs>
        <radialGradient id="sky-deck-fog">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={DECK_FOG_ALPHA} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={DECK_FOG_ALPHA * 0.45} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        {/* The label chip's specular edge — `--glass-vl` from styles/glass.css, bright at both
            extremities and gone through the middle. Vertical, so `y2="1"`. */}
        <linearGradient id="sky-chip-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={FRAME_CHROME.chipEdgeTop} />
          <stop offset="50%" stopColor={FRAME_CHROME.chipEdgeMid} />
          <stop offset="100%" stopColor={FRAME_CHROME.chipEdgeBottom} />
        </linearGradient>
      </defs>
      {frames.map((f) =>
        framed ? (
          <FramedCard key={f.did} f={f} hov={hovered === f.did} u={u} />
        ) : (
          <BareDeck key={f.did} f={f} hov={hovered === f.did} u={u} />
        ),
      )}
    </g>
  );
});

/* ── framed: the full glass card ─────────────────────────────────────────── */

function FramedCard({ f, hov, u }: { f: DeckFrameData; hov: boolean; u: number }) {
  const b = f.frame;
  // every typographic measure in one place, so the header block scales as one object.
  // `coverW` survives the cover tile itself: it is what indents the deck name to where the
  // header's text column starts, so the name sits in the same place with or without a tile.
  const inset = FRAME_INSET_PX * u;
  const coverW = FRAME_COVER_W_PX * u;
  const pillW = FRAME_PILL_W_PX * u;
  const pillH = FRAME_PILL_H_PX * u;
  return (
    <g>
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

      <text
        x={b.minX + inset + coverW + inset * 0.7}
        y={b.minY + inset + FRAME_NAME_PX * u}
        fill={FRAME_CHROME.deckLabel}
        opacity={hov ? 1 : 0.88}
        fontFamily={FACE_JP}
        fontSize={FRAME_NAME_PX * u}
        fontWeight={700}
      >
        {f.name}
      </text>

      <text
        x={b.maxX - inset - pillW / 2}
        y={b.maxY - inset - pillH / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={FRAME_CHROME.gold}
        fontFamily={FACE_MONO}
        fontSize={FRAME_DUE_PX * u}
        fontWeight={700}
        letterSpacing={1.4 * u}
      >
        {f.dueCount === null ? '— DUE' : `${f.dueCount} DUE`}
      </text>
    </g>
  );
}

/* ── frameless: the constellation, its name, and the one figure that can't wait ── */

/**
 * No card, no cover, no counts — the deck reads as what it is, a group of stars, with its name
 * under it in the same screen-px type the framed header uses.
 *
 * **Everything sits on one line**, and that is a fitting constraint rather than a style choice. The
 * room available below the stars is what the framed layout already reserves there — `FRAME_PAD` +
 * `FRAME_FOOT`, 190 world units — which at the zooms this mode actually runs at (~0.11–0.24) is
 * 21–46 screen px. A stacked name-then-due block needs ~34px and would spill into the stars at the
 * bottom of that range; one line needs ~20px and clears it everywhere.
 *
 * The due figure is a gold dot and a count rather than a pill: at this size a pill's edge would be
 * most of its ink. A deck with nothing due draws no marker at all, which is the honest reading —
 * quiet means nothing to do — and it also buys the name the whole width back.
 */
function BareDeck({ f, hov, u }: { f: DeckFrameData; hov: boolean; u: number }) {
  const b = f.frame;
  const cx = (b.minX + b.maxX) / 2;
  // centred in the room below the stars: half of the pad + footer the framed cell already holds
  const y = b.maxY - (FRAME_PAD + FRAME_FOOT) / 2;
  const due = f.dueCount !== null && f.dueCount > 0 ? f.dueCount : null;
  // the fog covers exactly the hover region (`contentBoxOf`), grown by a soft margin
  const fog = contentBoxOf(b, false);

  /* Fit the chip's contents to the cell, in screen px, then size the pill to what survived. Two
     steps of degradation rather than one, because the due figure is the more important of the two
     facts and must not be what gets cut: first "12 DUE" shortens to "12" if spelling it out would
     leave the name under three characters, and only then does the name ellipsise. */
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
    <g>
      {/* Always mounted, faded by opacity rather than mounted on hover — a rect that appears on
          hover cannot transition, and the framed card's own hover eases over .28s, so a frameless
          deck snapping would be the odd one out. Opacity is safe to transition where the geometry is
          not: it carries no zoom, so it never has to land on the same frame as the viewBox. */}
      <rect
        className="sky-fog"
        x={fog.minX - DECK_FOG_PAD}
        y={fog.minY - DECK_FOG_PAD}
        width={fog.maxX - fog.minX + 2 * DECK_FOG_PAD}
        height={fog.maxY - fog.minY + 2 * DECK_FOG_PAD}
        rx={44}
        fill="url(#sky-deck-fog)"
        opacity={hov ? 1 : 0}
      />
      {/* the pill: glass fill, then the specular edge over it as its own stroked rect so the two
          can carry different gradients — `--glass-fill` is flat, `--glass-vl` is not */}
      <rect x={chipX} y={y - chipH / 2} width={chipW} height={chipH} rx={chipH / 2} fill={FRAME_CHROME.chipFill} />
      <rect
        x={chipX}
        y={y - chipH / 2}
        width={chipW}
        height={chipH}
        rx={chipH / 2}
        fill="none"
        stroke="url(#sky-chip-edge)"
        strokeWidth={1.1}
        vectorEffect="non-scaling-stroke"
      />

      {/* Two `<text>` elements at computed positions rather than tspans in one centred run: the pill
          has to be sized around the content anyway, so the widths are already known, and placing
          each one absolutely is what keeps the text aligned with the box drawn around it. */}
      <text
        x={nameX}
        y={y}
        dominantBaseline="central"
        fill={FRAME_CHROME.deckLabel}
        opacity={hov ? 1 : 0.9}
        fontFamily={FACE_JP}
        fontSize={FRAME_NAME_PX * u}
        fontWeight={700}
      >
        {name}
      </text>
      {dueText && (
        <text
          x={dueX}
          y={y}
          textAnchor="end"
          dominantBaseline="central"
          fill={FRAME_CHROME.gold}
          fontFamily={FACE_MONO}
          fontSize={FRAME_DUE_INLINE_PX * u}
          fontWeight={700}
          letterSpacing={CHIP_DUE_TRACK_PX * u}
        >
          {dueText}
        </text>
      )}
    </g>
  );
}
