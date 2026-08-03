import {
  DECK_GRID_GAP,
  DECK_PAD,
  FRAME_FOOT,
  FRAME_HEAD,
  FRAME_MIN_W,
  FRAME_MIN_W_PER_CHAR,
  FRAME_PAD,
  GRID_ASPECT,
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
  /** The grid plus half a gap of margin — what the sky view frames and what pan is confined to. */
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

  // half a gap of margin, so the outermost frames rest off the boundary instead of against it
  const margin = DECK_GRID_GAP / 2;
  return {
    places,
    bounds: {
      minX: -gridW / 2 - margin,
      minY: -gridH / 2 - margin,
      maxX: gridW / 2 + margin,
      maxY: gridH / 2 + margin,
    },
  };
};

/**
 * Which deck a world point falls in: the cell containing it, or failing that the nearest cell
 * centre. The fallback is what makes the space between cells clickable — a press in the gutter
 * enters the deck it was nearest to rather than doing nothing, which is the difference between a
 * sky that feels responsive and one that feels like it has dead zones.
 */
export const deckAt = (layout: SkyLayout, p: Point): number | null => {
  let nearest: number | null = null;
  let bestD = Infinity;
  for (const place of layout.places.values()) {
    const { cell } = place;
    if (p.x >= cell.minX && p.x <= cell.maxX && p.y >= cell.minY && p.y <= cell.maxY) return place.did;
    const c = centreOf(cell);
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      nearest = place.did;
    }
  }
  return nearest;
};

/**
 * Which deck's card frame a world point is over, or null in the gutters. Strict containment, no
 * nearest fallback: this answers *hover* — "am I over the card?" — where `deckAt` answers a click,
 * which deserves the generosity. Resolved by coordinates like every other pick, so the frames
 * themselves stay pointer-transparent and panning over one is panning the sky.
 */
export const frameAt = (layout: SkyLayout, p: Point): number | null => {
  for (const place of layout.places.values()) {
    const { frame } = place;
    if (p.x >= frame.minX && p.x <= frame.maxX && p.y >= frame.minY && p.y <= frame.maxY) return place.did;
  }
  return null;
};
