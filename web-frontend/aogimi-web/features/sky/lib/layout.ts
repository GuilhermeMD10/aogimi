import {
  DECK_GRID_GAP,
  DECK_PAD,
  DECK_HIT_SKIRT,
  FRAME_LOD_PX,
  FRAME_FOOT,
  FRAME_HEAD,
  FRAME_MIN_W,
  FRAME_MIN_W_PER_CHAR,
  FRAME_PAD,
  GRID_ASPECT,
  SOLO_FIELD_CELLS,
} from './config';
import type { Bounds, Point } from './types';

/**
 * Where each deck sits in the world: a row-major grid in deck order, centred on the world centre.
 *
 * Stars are generated in deck-local space, so a deck's world position is a *layout output* rather
 * than something baked into its stars. That inversion is what buys deck separation for free: a deck
 * that doubles in size gets a bigger cell, and not one star of any other deck moves.
 *
 * The cells are **uniform** — every cell is the largest frame footprint on the sky — so the
 * arrangement reads as a grid rather than as a mosaic, and a deck's neighbours sit where the eye
 * expects them. The gap is in **world units**, so the separation survives every zoom level. The
 * grid's shape (columns × rows) is whichever candidate fits a landscape stage best; see
 * GRID_ASPECT for why that target is a constant rather than the live viewport.
 */

export type DeckPlace = {
  did: number;
  /** Add this to a deck-local point to get a world point. */
  origin: Point;
  /** World box around the deck's stars, padded by DECK_PAD. What focusing the deck frames. */
  box: Bounds;
  /**
   * The deck's card frame in world space: FRAME_PAD around the stars, the FRAME_HEAD band above,
   * FRAME_FOOT below, never narrower than the name needs. What `SkyFrames` draws, and what a
   * hover at the sky view tests — computed here so the drawn card and the layout's cells can
   * never disagree about where a frame is.
   */
  frame: Bounds;
  /** The deck's grid cell. Uniform across decks and no smaller than `frame`; what a click at the
   *  sky view tests. */
  cell: Bounds;
};

export type SkyLayout = {
  places: Map<number, DeckPlace>;
  /** The grid plus half a gap of margin — what the sky view frames and what pan is confined to.
   *  A lone deck's field is floored at SOLO_FIELD_CELLS cells, so its card can't fill the stage. */
  bounds: Bounds;
};

const EMPTY_BOX: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

export const EMPTY_LAYOUT: SkyLayout = { places: new Map(), bounds: EMPTY_BOX };

const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

const shift = (b: Bounds, by: Point): Bounds => ({
  minX: b.minX + by.x,
  minY: b.minY + by.y,
  maxX: b.maxX + by.x,
  maxY: b.maxY + by.y,
});

/**
 * A deck's frame around its local star box (the handover's `frameBox`). Width is the stars plus
 * FRAME_PAD each side, floored at what the name needs and re-centred on the stars when the floor
 * wins — so a one-star deck still wears a whole card rather than a sliver.
 *
 * **Frame LOD does not change this box**, and that is a measured decision rather than a shortcut.
 * A frameless cell that dropped the header and footer bands (410 of ~1084 world units on a real
 * account) looks like it should lift the fit, and it does — by 1.09–1.32×, averaging ~1.18. But a
 * frameless deck still has to show its name, the name is drawn in *screen* px (see FRAME_NAME_PX),
 * and reserving world-unit room for screen-px type is self-cancelling: the lower the zoom, the more
 * world units the same 20px of type needs. Sized for the worst zoom the mode actually runs at, the
 * band claws back all but ~1.05–1.10× of the gain — and the shrink would have made `layoutDecks`
 * mode-dependent, which puts the cell size on both sides of the LOD threshold and invites exactly
 * the oscillation FRAME_LOD_PX warns about.
 *
 * So the cell stays framed in both modes, LOD is a *drawing* decision only, and the frameless name
 * is drawn into the room the header and footer bands were already reserving.
 */
const frameBoxOf = (starBox: Bounds, name: string): Bounds => {
  const padded = starBox.maxX - starBox.minX + 2 * FRAME_PAD;
  const w = Math.max(padded, FRAME_MIN_W + name.length * FRAME_MIN_W_PER_CHAR);
  const minX = padded >= w ? starBox.minX - FRAME_PAD : (starBox.minX + starBox.maxX) / 2 - w / 2;
  return {
    minX,
    minY: starBox.minY - FRAME_PAD - FRAME_HEAD,
    maxX: minX + w,
    maxY: starBox.maxY + FRAME_PAD + FRAME_FOOT,
  };
};

/**
 * Lay the decks out on the grid, given each one's **local** tight box and its name (which floors
 * its frame's width — the one thing about a frame the stars cannot decide).
 *
 * Decks are placed in id order, row-major, so the arrangement is stable: mining into one deck
 * never trades any deck's cell for another — at most it grows every cell a little, which the
 * fitted camera absorbs without anything changing places. A short last row is centred, so the
 * grid reads as a finished shape rather than as one with a corner missing.
 *
 * Frame LOD is deliberately **not** an input here — see `frameBoxOf`. One arrangement serves both
 * modes, which is what keeps the LOD threshold a pure function of the layout instead of a feedback
 * loop through it.
 */
export const layoutDecks = (localBoxes: Map<number, Bounds>, names: Map<number, string>): SkyLayout => {
  const dids = [...localBoxes.keys()].sort((a, b) => a - b);
  if (!dids.length) return EMPTY_LAYOUT;

  const boxes = dids.map((did) => localBoxes.get(did)!);
  const frames = dids.map((did, i) => frameBoxOf(boxes[i], names.get(did) ?? ''));

  // uniform cells: the largest frame footprint on the sky, so the arrangement reads as a grid
  let cellW = 0;
  let cellH = 0;
  for (const f of frames) {
    cellW = Math.max(cellW, f.maxX - f.minX);
    cellH = Math.max(cellH, f.maxY - f.minY);
  }

  // The grid's shape: of every candidate cols×rows that holds n decks, the one a GRID_ASPECT
  // window fits at the largest scale — the same maximise-the-fit the camera will run for real,
  // done here against the nominal stage. Scored per candidate rather than solved in closed form
  // because the gap makes the aspect of a grid nonlinear in its column count.
  const n = dids.length;
  let cols = 1;
  let best = -Infinity;
  for (let c = 1; c <= n; c++) {
    const r = Math.ceil(n / c);
    const gw = c * cellW + (c - 1) * DECK_GRID_GAP;
    const gh = r * cellH + (r - 1) * DECK_GRID_GAP;
    const k = Math.min(GRID_ASPECT / gw, 1 / gh);
    if (k > best) {
      best = k;
      cols = c;
    }
  }
  const rows = Math.ceil(n / cols);
  const gridW = cols * cellW + (cols - 1) * DECK_GRID_GAP;
  const gridH = rows * cellH + (rows - 1) * DECK_GRID_GAP;

  const places = new Map<number, DeckPlace>();
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // a short last row is centred: offset by half of what its missing cells would have covered
    const inRow = row === rows - 1 ? n - cols * (rows - 1) : cols;
    const rowOffset = ((cols - inRow) * (cellW + DECK_GRID_GAP)) / 2;

    const at: Point = {
      x: -gridW / 2 + rowOffset + col * (cellW + DECK_GRID_GAP) + cellW / 2,
      y: -gridH / 2 + row * (cellH + DECK_GRID_GAP) + cellH / 2,
    };

    // the *frame* is what is centred in the cell — the handover's head/foot bias falls out of
    // centring the framed card rather than the bare stars
    const local = centreOf(frames[i]);
    const origin = { x: at.x - local.x, y: at.y - local.y };

    places.set(dids[i], {
      did: dids[i],
      origin,
      box: shift(
        {
          minX: boxes[i].minX - DECK_PAD,
          minY: boxes[i].minY - DECK_PAD,
          maxX: boxes[i].maxX + DECK_PAD,
          maxY: boxes[i].maxY + DECK_PAD,
        },
        origin,
      ),
      frame: shift(frames[i], origin),
      cell: {
        minX: at.x - cellW / 2,
        minY: at.y - cellH / 2,
        maxX: at.x + cellW / 2,
        maxY: at.y + cellH / 2,
      },
    });
  }

  // Half a gap of margin, so the outermost frames rest off the boundary instead of against it —
  // floored, for a lone deck, at SOLO_FIELD_CELLS cells in each axis. The camera fits whatever field
  // it is handed, so a single deck's card would otherwise be drawn at the whole stage and grow with
  // every card mined into it: with no neighbour, the field is the only thing that can bound a card.
  // The grid is centred on the origin, so growing the field about the origin keeps it centred.
  const margin = DECK_GRID_GAP / 2;
  const solo = n === 1 ? SOLO_FIELD_CELLS : 0;
  const fieldW = Math.max(gridW + 2 * margin, cellW * solo);
  const fieldH = Math.max(gridH + 2 * margin, cellH * solo);
  return {
    places,
    bounds: {
      minX: -fieldW / 2,
      minY: -fieldH / 2,
      maxX: fieldW / 2,
      maxY: fieldH / 2,
    },
  };
};

/** A layout's uniform cell size. Every cell is the same box by construction, so the first will do. */
export const cellSizeOf = (layout: SkyLayout): { w: number; h: number } => {
  const first = layout.places.values().next().value;
  if (!first) return { w: 0, h: 0 };
  return { w: first.cell.maxX - first.cell.minX, h: first.cell.maxY - first.cell.minY };
};

/**
 * Whether decks should wear full frames: is a card wide enough on screen for its header to fit?
 *
 * A plain threshold, and it can be one because the layout does not answer to the mode (see
 * `frameBoxOf`). Nothing here feeds back — `cardPx` is the same number whichever mode is live — so
 * there is no oscillation to damp and no hysteresis to carry. Had the frameless cell been allowed to
 * shrink, this would have needed a deadband and a memory of its own answer.
 */
export const framedAt = (layout: SkyLayout, fitZoom: number): boolean => {
  const cardPx = cellSizeOf(layout).w * fitZoom;
  if (cardPx <= 0) return true; // no decks placed yet: nothing to decide, keep the richer default
  return cardPx >= FRAME_LOD_PX;
};

/** Distance from a point to a rectangle — 0 inside it. Squared, since it is only ever compared. */
const distToBoxSq = (p: Point, b: Bounds): number => {
  const dx = Math.max(b.minX - p.x, 0, p.x - b.maxX);
  const dy = Math.max(b.minY - p.y, 0, p.y - b.maxY);
  return dx * dx + dy * dy;
};

/**
 * Which deck a world point falls in: the cell containing it, or the nearest cell **within
 * DECK_HIT_SKIRT of its edge**. Past that, `null` — the press hit sky.
 *
 * The skirt is what makes the gutters between cells clickable, so the grid has no dead seams. What
 * it must not do is make the *whole stage* clickable: measured to the nearest cell **centre** with no
 * bound at all, every press anywhere resolved to some deck, so a click in the empty band the fitted
 * camera leaves outside the grid entered whichever deck happened to be nearest — an extremity one.
 * Nearest-*edge* with a bound gives each deck a zone that stops where the eye says it should.
 */
export const deckAt = (layout: SkyLayout, p: Point): number | null => {
  let nearest: number | null = null;
  let bestD = Infinity;
  const reach = DECK_HIT_SKIRT * DECK_HIT_SKIRT;
  for (const place of layout.places.values()) {
    const d = distToBoxSq(p, place.cell);
    if (d === 0) return place.did; // inside the cell: no need to look further
    if (d < bestD) {
      bestD = d;
      nearest = place.did;
    }
  }
  return bestD <= reach ? nearest : null;
};

/**
 * The box a deck actually *occupies on screen*, which is the frame in framed mode and, frameless,
 * the frame minus the empty header band — nothing is drawn up there once the card is gone.
 *
 * Exported because two things have to agree on it exactly: this is the hover region, and it is the
 * rectangle the hover fog is painted over. Let them drift and the reader gets a fog lighting up while
 * the cursor is somewhere else.
 */
export const contentBoxOf = (frame: Bounds, framed: boolean): Bounds =>
  framed ? frame : { ...frame, minY: frame.minY + FRAME_HEAD };

/**
 * Which deck a world point is over, or null between them. Strict containment, no nearest fallback:
 * this answers *hover* — "am I over the deck?" — where `deckAt` answers a click, which deserves the
 * generosity. Resolved by coordinates like every other pick, so the frames themselves stay
 * pointer-transparent and panning over one is panning the sky.
 */
export const frameAt = (layout: SkyLayout, p: Point, framed = true): number | null => {
  for (const place of layout.places.values()) {
    const b = contentBoxOf(place.frame, framed);
    if (p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY) return place.did;
  }
  return null;
};
