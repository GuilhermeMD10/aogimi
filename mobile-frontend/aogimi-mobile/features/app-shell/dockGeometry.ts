import { interpolateColor } from 'react-native-reanimated';

/**
 * The dock's layout maths — pure, no React, no RN. Everything here runs on the
 * UI thread inside `useDerivedValue`, hence the `'worklet'` directives.
 *
 * ── The shape ────────────────────────────────────────────────────────────────
 * There is no bar. Four independent marks sit in a row, each a circle of
 * frosted glass and nothing else — no rail joining them:
 *
 *   · the **current** route, a full circle with the `active` fill over its
 *     glass and its glyph on top;
 *   · the one **either side of it**, a smaller circle of bare glass carrying a
 *     deliberately small glyph — near enough to be worth naming;
 *   · everything **further out**, a plain glass dot, no glyph. Two steps away
 *     a route is a position, not a destination, and a glyph that small says
 *     less than the dot does.
 *
 * The gaps recede the same way the marks do — widest either side of the
 * current route, tighter every step out — so the row falls away from its
 * centre instead of marching off it.
 *
 * Open, every route becomes the same filled circle at the same gap — the one
 * moment the four do line up, because that state is a menu rather than an
 * indicator.
 *
 * `layout()` returns all the geometry for one (current, open) pair;
 * `lerpLayout()` blends two of them, so every state change is a single `t`
 * interpolation and adding an animated property means adding a field here —
 * not another shared value.
 */
export const SIZES = {
  /** diameter of the current route's circle */
  item: 60,
  /** the glyph inside it */
  icon: 26,
  /** diameter of the circle immediately either side of the current route */
  adjacent: 33,
  /** its glyph — half its circle, so it reads as a hint rather than a button */
  adjacentIcon: 16.5,
  /** diameter of the first route with no glyph at all */
  dot: 12,
  /** diameter lost per step beyond that one */
  shrink: 3,
  /** beside the current route: the widest gap, and the only one open */
  gap: 12,
  /** taken off each gap further out … */
  gapShrink: 2,
  /** … down to this floor. The hit slop is cut from it, so neighbouring
   *  targets meet without overlapping. */
  gapMin: 6,
  /** room around the outermost marks, so their shadows are not cut short */
  padding: 12,
  /** gap between the dock and the bottom edge, before the safe-area inset */
  bottom:0,
  /** how much of itself a route that is not current shows */
  restOpacity: 0.75,
} as const;

/** As tall as the current route's circle plus the room around it. */
export const DOCK_HEIGHT = SIZES.item + SIZES.padding * 2;

/** The fills `layout()` bakes into a frame, so `lerpLayout()` can blend them.
 *  Resolved from the palette by `dockMaterial`, not here. */
export type DockColors = {
  /** the current route's circle */
  active: string;
  /** a circle that is only a circle because the dock is open */
  tile: string;
  /** a route at rest — `tile` at zero alpha, so the blend between the two
   *  moves alpha alone rather than passing through a colour neither has. */
  clear: string;
};

export type DockItemFrame = {
  /** left edge within the row */
  x: number;
  /** the circle's diameter */
  size: number;
  /** the glyph's rendered size — 0 for a dot, which has none */
  glyph: number;
  /** How much of itself the mark is showing: 1 for the current route, less at
   *  rest. Multiplied into the material's alphas and the glyph — never set as
   *  `opacity` on the mark, which would put the blur under a translucent
   *  ancestor and switch it off. See `DockItem`. */
  rest: number;
  /** the tint painted over the glass */
  bg: string;
};

export type DockFrame = {
  width: number;
  height: number;
  /** translateX that puts the current route's circle at the screen's centre */
  shift: number;
  items: DockItemFrame[];
};

const mix = (a: number, b: number, t: number): number => {
  'worklet';
  return a + (b - a) * t;
};

/** How many steps out from the route *beside* the current one this sits — so
 *  0 is the adjacent route itself and 1 is the first plain dot. */
function stepsOut(index: number, current: number): number {
  'worklet';
  return Math.max(0, Math.abs(index - current) - 1);
}

/** The gap between `index` and the next, measured by whichever of the two sits
 *  further out. Open, the row is a menu of peers: one gap for all. */
function gapAfter(index: number, current: number, open: boolean): number {
  'worklet';
  if (open) return SIZES.gap;
  const out = Math.max(Math.abs(index - current), Math.abs(index + 1 - current));
  return Math.max(SIZES.gapMin, SIZES.gap - (out - 1) * SIZES.gapShrink);
}

/**
 * Every measurement the dock needs for one (current, open) pair. Positions are
 * left edges within the row; the row itself is centred on screen and then
 * nudged by `shift` so the current route's circle lands dead centre.
 */
export function layout(
  count: number,
  current: number,
  open: boolean,
  colors: DockColors,
): DockFrame {
  'worklet';
  const items: DockItemFrame[] = [];
  let x = SIZES.padding;

  for (let i = 0; i < count; i++) {
    const filled = open || i === current;
    const steps = stepsOut(i, current);
    const adjacent = !filled && steps === 0;

    // Three cases, in the order they sit outwards from the current route.
    let size: number;
    let glyph: number;
    if (filled) {
      size = SIZES.item;
      glyph = SIZES.icon;
    } else if (adjacent) {
      size = SIZES.adjacent;
      glyph = SIZES.adjacentIcon;
    } else {
      size = SIZES.dot - (steps - 1) * SIZES.shrink;
      glyph = 0;
    }

    items.push({
      x,
      size,
      glyph,
      rest: filled ? 1 : SIZES.restOpacity,
      bg: filled ? (i === current ? colors.active : colors.tile) : colors.clear,
    });

    x += size;
    if (i < count - 1) x += gapAfter(i, current, open);
  }

  const width = x + SIZES.padding;
  const centre = items[current].x + items[current].size / 2;

  return {
    width,
    height: DOCK_HEIGHT,
    items,
    // Open, every mark is the same size, so the row just sits centred.
    shift: open ? 0 : width / 2 - centre,
  };
}

/** Blends two layouts. */
export function lerpLayout(a: DockFrame, b: DockFrame, t: number): DockFrame {
  'worklet';
  return {
    width: mix(a.width, b.width, t),
    height: b.height,
    shift: mix(a.shift, b.shift, t),
    items: b.items.map((to, i) => {
      const from = a.items[i];
      return {
        x: mix(from.x, to.x, t),
        size: mix(from.size, to.size, t),
        glyph: mix(from.glyph, to.glyph, t),
        rest: mix(from.rest, to.rest, t),
        bg: interpolateColor(t, [0, 1], [from.bg, to.bg]),
      };
    }),
  };
}

/**
 * The item whose centre is nearest an x within the row. Used by the slide
 * gesture, so the gaps belong to whichever mark is closer and the finger is
 * never "between" routes.
 */
export function nearestIndex(x: number, items: readonly DockItemFrame[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < items.length; i++) {
    const dist = Math.abs(x - (items[i].x + items[i].size / 2));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
