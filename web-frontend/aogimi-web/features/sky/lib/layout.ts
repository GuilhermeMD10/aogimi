import { DECK_GAP, DECK_PAD, MIN_VIEW } from './config';
import type { Bounds, Point } from './types';

/**
 * Where each deck sits in the world: on a ring around a common centre, in id order from the top,
 * clockwise.
 *
 * Stars are generated in deck-local space, so a deck's world position is a *layout output* rather
 * than something baked into its stars. That inversion is what buys deck separation for free: a deck
 * that doubles in size gets a wider berth on the ring, and not one star of any other deck moves.
 *
 * The ring's radius comes from the decks themselves: it grows until no neighbouring pair sits
 * closer than the two decks' own reach plus DECK_GAP. Radius is the one degree of freedom a ring
 * has, so the constraint is a single maximum rather than a packing problem — and because the gap is
 * in **world units**, the separation survives every zoom level exactly as the grid's did.
 */

export type DeckPlace = {
  did: number;
  /** Add this to a deck-local point to get a world point. */
  origin: Point;
  /** World box around the deck's stars, padded by DECK_PAD. What focusing the deck frames. */
  box: Bounds;
  /** The deck's own footprint on the ring. Wider than `box`; what a click at the sky view tests. */
  cell: Bounds;
};

export type SkyLayout = {
  places: Map<number, DeckPlace>;
  /** Union of every cell — what the sky view frames and what pan is confined to. */
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

/** A deck's footprint: its stars plus their margin, never smaller than MIN_VIEW on either side, so
 *  a one-star deck is a small object rather than a point. */
const footprint = (box: Bounds) => ({
  w: Math.max(MIN_VIEW, box.maxX - box.minX + 2 * DECK_PAD),
  h: Math.max(MIN_VIEW, box.maxY - box.minY + 2 * DECK_PAD),
});

/**
 * Lay the decks out on the ring, given each one's **local** tight box.
 *
 * Decks are placed in id order, so the arrangement is stable: mining into one deck never moves the
 * others around the circle — at most it pushes the whole ring a little wider, which the fitted
 * camera absorbs without anything trading places.
 */
export const layoutDecks = (localBoxes: Map<number, Bounds>): SkyLayout => {
  const dids = [...localBoxes.keys()].sort((a, b) => a - b);
  if (!dids.length) return EMPTY_LAYOUT;

  const boxes = dids.map((did) => localBoxes.get(did)!);
  const sizes = boxes.map(footprint);

  const n = dids.length;
  const angleOf = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;

  // Ring radius: every adjacent pair must clear each other across its chord. The requirement is
  // exact rather than a circumscribed-circle bound, and that matters: the chord's *direction*
  // depends only on the pair's angles, never on the radius, so the separation two axis-aligned
  // cells genuinely need along it — enough room on the x axis, or enough on the y, whichever the
  // direction makes cheaper — can be computed outright. A circle bound over-reserves by up to 40%
  // and inflates the whole ring to the worst case of its biggest member; an inscribed one breaks
  // exactly at small counts, where neighbours meet diagonally.
  let ring = 0;
  if (n > 1) {
    let need = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // direction of the chord from centre i to centre j: perpendicular to the pair's mid-angle
      const psi = (angleOf(i) + (i + 1 === n ? angleOf(i) + (2 * Math.PI) / n : angleOf(j))) / 2 + Math.PI / 2;
      const cos = Math.abs(Math.cos(psi));
      const sin = Math.abs(Math.sin(psi));
      const sepX = cos > 1e-9 ? (sizes[i].w + sizes[j].w) / 2 / cos : Infinity;
      const sepY = sin > 1e-9 ? (sizes[i].h + sizes[j].h) / 2 / sin : Infinity;
      need = Math.max(need, Math.min(sepX, sepY) + DECK_GAP);
    }
    ring = need / (2 * Math.sin(Math.PI / n));
  }

  const places = new Map<number, DeckPlace>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < n; i++) {
    // from the top, clockwise — the reading order of a clock face rather than of a page
    const angle = angleOf(i);
    const at = { x: ring * Math.cos(angle), y: ring * Math.sin(angle) };

    const local = centreOf(boxes[i]);
    const origin = { x: at.x - local.x, y: at.y - local.y };
    const { w, h } = sizes[i];
    const cell: Bounds = { minX: at.x - w / 2, minY: at.y - h / 2, maxX: at.x + w / 2, maxY: at.y + h / 2 };

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
      cell,
    });

    if (cell.minX < minX) minX = cell.minX;
    if (cell.minY < minY) minY = cell.minY;
    if (cell.maxX > maxX) maxX = cell.maxX;
    if (cell.maxY > maxY) maxY = cell.maxY;
  }

  return { places, bounds: { minX, minY, maxX, maxY } };
};

/**
 * Which deck a world point falls in: the cell containing it, or failing that the nearest cell
 * centre. The fallback is what makes the space between cells clickable — a press in the moat, or in
 * the ring's empty middle, enters the deck it was nearest to rather than doing nothing, which is
 * the difference between a sky that feels responsive and one that feels like it has dead zones.
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
