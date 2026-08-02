import {
  CLOUD_SQUASH,
  CLUSTER_LEAF_MAX,
  CLUSTER_MAX_DEPTH,
  CLUSTER_SD_FLOOR,
  COLLAPSE_MIN_POINTS,
  GAP_FILL_QUOTA,
  GAP_FILL_SPACING,
  LOBE_ASPECT_MIN,
  LOD_SPAN_GROWTH,
  LOD_SPAN_STEPS,
  PEAK_QUOTA,
  STAR_SPACING_PX,
} from './config';
import { boundsCross, dist2, skyBounds } from './geometry';
import { SpatialGrid, pointBox } from './grid';
import { type GroupTint, RANKS, groupTint, rankOf } from './palette';
import type { Bounds, Point, Star } from './types';

/**
 * What a group of cards looks like when there are not enough pixels to draw it properly: a quadtree
 * per group, where every node carries the aggregates needed to paint it as one soft form, plus the
 * budget rule that decides which of its stars survive.
 *
 * The tree is a function of the data alone. Rebuilding it when the camera moves is the one mistake
 * that undoes the entire feature — `starLod` is the per-frame half, and it only reads.
 *
 * "Group" is deliberately unnamed here. At the outer view a group is a deck; inside a deck it is a
 * session; a tier below that it would be whatever that tier's unit turns out to be. The tree, the
 * collapse rule and the budget do not care, which is why adding a tier is supplying a different
 * grouping function rather than writing a second algorithm.
 */

/** A node of the tree, and the cloud lobe drawn in its place. */
export type Lobe = {
  /**
   * Stable across frames and across rebuilds, because it keys the DOM node and the gradient the
   * node fills with. Built from the quadrant *number*, never the position in `children`, so an
   * empty quadrant cannot shift its siblings' ids and take every transition with it.
   */
  id: string;
  gid: number; // the group this belongs to, for colouring and for keeping a mesh within one group
  cx: number; // centroid of the stars underneath, which is where the lobe sits
  cy: number;
  n: number; // how many stars that is
  /**
   * Root mean square distance from the centroid — the lobe's visual radius. Deliberately not the
   * bounding box: sizing from the box gives boxy, grid-aligned clouds, while sizing from the
   * spread puts the form where the mass actually is, so a sparse group reads wide and faint.
   */
  sd: number;
  /** 0..1, how much mass this node holds next to the busiest group in the sky. Drives alpha. */
  weight: number;
  /**
   * 0..1, how tightly this node's stars are packed against the tightest knot anywhere in the sky.
   *
   * Separate from `weight` because the two stop agreeing the moment a form subdivides. Weight is a
   * star *count*, so once every drawn lobe is a leaf holding one to four stars it collapses into a
   * narrow band and every point comes out the same size — no peaks, exactly where you are most
   * likely to be looking. Density does not care how far down the tree a node sits: four stars at
   * the spacing floor is a knot whether it is a leaf of a big group or a whole small one.
   */
  grain: number;
  /**
   * The colours this node is drawn in, from the ranks of the stars under it. Resolved once when
   * the tree is built rather than per frame — the ranks cannot change without the tree being
   * rebuilt anyway, and the alternative is re-blending every visible lobe sixty times a second.
   */
  tint: GroupTint;
  /**
   * How the stars under this node actually lie, from the covariance of their positions: the
   * principal axis in degrees, and ry/rx along it. The lobe ellipse stretches along the real
   * spread of the constellation it hides instead of wearing one fixed squash — the cloud echoes
   * the shape of the drawing inside it. Aggregated at build time like everything else here; the
   * renderer only ever reads two numbers.
   */
  angle: number;
  aspect: number;
  /**
   * Where the mastered cards under this node are, and how much of the node they are (0..1). The
   * gold core is drawn *at this point*, not at the lobe's centre — a knot of mastered words glints
   * where it actually sits, which is what makes a cloud point at its own contents before it
   * resolves into stars (guide §6.4). Null when the node holds none.
   */
  hot: Point | null;
  hotW: number;
  /**
   * How many stars under this node the reader has not been shown yet. At the outer view individual
   * stars are mostly not drawn, so without this a sky full of overnight arrivals would look exactly
   * like a sky full of old ones — and the reader would have to go in blind to find out.
   */
  unseen: number;
  /**
   * The TIGHT box around the stars, not the quadtree cell. Culling or measuring against the cell is
   * what makes clouds appear over empty sky, since a cell is mostly empty by the time it has been
   * split a few times.
   */
  box: Bounds;
  /** Star ids, on leaves only. An internal node's membership is its subtree's, gathered on demand —
   *  which is O(the collapsed group) at the few nodes that actually collapse, rather than O(n log n)
   *  of stored ids that mostly go unread. */
  starIds: number[] | null;
  children: Lobe[] | null;
};

export type Cloud = { gid: number; root: Lobe };

/**
 * A join between two survivors of one group. Flat coordinates plus the group it belongs to, rather
 * than references, because the renderer wants a line and a colour and nothing else. The id is
 * canonical — lower end first — so it survives whatever order the tree happened to be walked in.
 */
export type MeshEdge = {
  id: string;
  gid: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Mean weight of the two ends, so a join between busy survivors reads stronger. */
  weight: number;
};

type MeshNode = { id: string; x: number; y: number; weight: number };

/**
 * A minimum spanning tree over one group's survivors, appended to `out`.
 *
 * The fewest joins that still make a subdivided group read as one connected object — k nodes give
 * exactly k-1 edges, so a form gains structure as it splits instead of gaining clutter. It also
 * lands close to the truth: a session grows by sprouting within LINK_REACH of a member it already
 * has, so nearest-neighbour joins between its survivors track the real links, and the skeleton you
 * see at distance pre-figures the drawing about to emerge from it.
 *
 * This is what keeps a collapsed group looking like a *drawing* rather than a smear: the real edge
 * graph disappears with its stars, and a coarser graph over the survivors takes its place at the
 * same visual weight.
 *
 * Prim's, O(k^2), on a k bounded by the star budget — a few dozen at the very worst.
 */
const addMesh = (nodes: MeshNode[], gid: number, out: MeshEdge[]) => {
  const n = nodes.length;
  if (n < 2) return;

  const joined = new Uint8Array(n);
  const near = new Float64Array(n);
  const via = new Int32Array(n);
  joined[0] = 1;
  for (let i = 1; i < n; i++) near[i] = dist2(nodes[0], nodes[i]);

  for (let added = 1; added < n; added++) {
    let pick = -1;
    for (let i = 1; i < n; i++) if (!joined[i] && (pick < 0 || near[i] < near[pick])) pick = i;
    if (pick < 0) break;
    joined[pick] = 1;

    const a = nodes[via[pick]];
    const b = nodes[pick];
    out.push({
      id: a.id < b.id ? `${a.id}~${b.id}` : `${b.id}~${a.id}`,
      gid,
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
      weight: (a.weight + b.weight) / 2,
    });

    for (let i = 1; i < n; i++) {
      if (joined[i]) continue;
      const d = dist2(nodes[pick], nodes[i]);
      if (d < near[i]) {
        near[i] = d;
        via[i] = pick;
      }
    }
  }
};

/**
 * A square cell around the stars, a touch larger than they are. Square matters: it keeps every
 * descendant cell square too, so the screen-span test behaves the same on both axes instead of
 * subdividing one of them earlier than the other.
 */
const squareCell = (box: Bounds): Bounds => {
  const half = (Math.max(box.maxX - box.minX, box.maxY - box.minY) * 1.02 + 2) / 2;
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return { minX: cx - half, minY: cy - half, maxX: cx + half, maxY: cy + half };
};

/** Quadrant q of a cell, by the bits of q: 1 is the right half, 2 the bottom. */
const quadrant = (cell: Bounds, q: number, midX: number, midY: number): Bounds => ({
  minX: q & 1 ? midX : cell.minX,
  maxX: q & 1 ? cell.maxX : midX,
  minY: q & 2 ? midY : cell.minY,
  maxY: q & 2 ? cell.maxY : midY,
});

const build = (
  points: Star[],
  cell: Bounds,
  depth: number,
  id: string,
  gid: number,
  busiest: number,
  all: Lobe[],
): Lobe => {
  let sx = 0;
  let sy = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const hist = new Array<number>(RANKS).fill(0);
  let unseen = 0;
  for (const s of points) {
    sx += s.x;
    sy += s.y;
    if (!s.seen) unseen += 1;
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.y > maxY) maxY = s.y;
    hist[rankOf(s.mastery)] += 1;
  }
  const centre = { x: sx / points.length, y: sy / points.length };

  // Second pass: the covariance of the positions (which carries both the spread and the node's
  // orientation), and where the mastered cards sit. All of it lands on the lobe as plain numbers —
  // this is the whole trick that lets the gradient use per-star information without touching the
  // per-frame cost: the stars are read here, once per data change, never in the renderer.
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let hx = 0;
  let hy = 0;
  let nHot = 0;
  for (const s of points) {
    const dx = s.x - centre.x;
    const dy = s.y - centre.y;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
    if (rankOf(s.mastery) === RANKS - 1) {
      hx += s.x;
      hy += s.y;
      nHot += 1;
    }
  }
  const spread = sxx + syy;

  // principal axis of the covariance: the direction the stars actually run in, and how strongly.
  // Under three points an axis is noise, so those keep the default squash.
  let angle = 0;
  let aspect = CLOUD_SQUASH;
  if (points.length >= 3) {
    const n = points.length;
    const exx = sxx / n;
    const eyy = syy / n;
    const exy = sxy / n;
    const mid = (exx + eyy) / 2;
    const dev = Math.hypot((exx - eyy) / 2, exy);
    if (mid + dev > 1e-6) {
      angle = ((Math.atan2(2 * exy, exx - eyy) / 2) * 180) / Math.PI;
      aspect = Math.min(CLOUD_SQUASH, Math.max(LOBE_ASPECT_MIN, Math.sqrt(Math.max(0, mid - dev) / (mid + dev))));
    }
  }

  const leaf = points.length <= CLUSTER_LEAF_MAX || depth >= CLUSTER_MAX_DEPTH;
  const lobe: Lobe = {
    id,
    gid,
    cx: centre.x,
    cy: centre.y,
    n: points.length,
    sd: Math.max(CLUSTER_SD_FLOOR, Math.sqrt(spread / points.length)),
    // log-scaled against the busiest group, so the full 0..1 range is actually reached. A
    // straight count/cap collapses the moment one sky has far bigger groups than another.
    weight: Math.log(1 + points.length) / Math.log(1 + busiest),
    grain: 0, // needs the whole sky to normalise against; filled in by buildClouds
    tint: groupTint(hist),
    angle,
    aspect,
    hot: nHot ? { x: hx / nHot, y: hy / nHot } : null,
    hotW: Math.min(1, (nHot / Math.max(3, points.length)) * 2.2),
    unseen,
    box: { minX, minY, maxX, maxY },
    starIds: leaf ? points.map((s) => s.id) : null,
    children: null,
  };
  all.push(lobe);

  if (leaf) return lobe;

  const midX = (cell.minX + cell.maxX) / 2;
  const midY = (cell.minY + cell.maxY) / 2;
  const quads: Star[][] = [[], [], [], []];
  for (const s of points) quads[(s.x < midX ? 0 : 1) + (s.y < midY ? 0 : 2)].push(s);

  lobe.children = [];
  for (let q = 0; q < 4; q++) {
    if (!quads[q].length) continue;
    lobe.children.push(
      build(quads[q], quadrant(cell, q, midX, midY), depth + 1, `${id}.${q}`, gid, busiest, all),
    );
  }
  return lobe;
};

/** Stars per unit area, up to a constant. sd is floored, so this never divides by zero. */
const packing = (lobe: Lobe) => lobe.n / (lobe.sd * lobe.sd);

/**
 * One tree per group, in `groupIds` order so the draw order is stable rather than however the
 * grouping map happened to fill.
 *
 * `keyOf` is what makes this serve every tier: pass `s => s.did` and each tree spans a whole deck,
 * pass `s => s.cid` and each spans one session. Nothing below this line knows which it got.
 *
 * Cheap enough to run whenever the data changes, which includes a click: `count` feeds the
 * histograms, so a review does change the answer.
 */
export const buildClouds = (stars: Star[], groupIds: number[], keyOf: (s: Star) => number): Cloud[] => {
  const byGid = new Map<number, Star[]>();
  for (const s of stars) {
    const gid = keyOf(s);
    const group = byGid.get(gid);
    if (group) group.push(s);
    else byGid.set(gid, [s]);
  }

  let busiest = 1;
  for (const group of byGid.values()) busiest = Math.max(busiest, group.length);

  const out: Cloud[] = [];
  const all: Lobe[] = [];
  for (const gid of groupIds) {
    const group = byGid.get(gid);
    if (!group?.length) continue;
    // skyBounds with no padding is the tight box, which is what the root cell is squared around
    const cell = squareCell(skyBounds(group, 0, 0));
    out.push({ gid, root: build(group, cell, 0, `${gid}`, gid, busiest, all) });
  }

  // grain needs every node before any of them can be scored, so it is a second pass rather than
  // part of the recursion. Normalised against the tightest knot the sky actually contains, so the
  // full range is always in use — an absolute cap would flatten a loosely packed sky to nothing.
  // sqrt, because packing is an area measure and the eye reads the radius.
  let densest = 0;
  for (const lobe of all) densest = Math.max(densest, packing(lobe));
  if (densest > 0) for (const lobe of all) lobe.grain = Math.sqrt(packing(lobe) / densest);

  return out;
};

/* ---------- the focused-deck walk: zoom decides, per session ---------- */

/** What to draw this frame inside a focused deck: the soft forms, the lobes, and the mesh. */
export type CloudFrame = { halos: Cloud[]; lobes: Lobe[]; edges: MeshEdge[] };

export const EMPTY_CLOUD_FRAME: CloudFrame = { halos: [], lobes: [], edges: [] };

/** Shared so a caller can hand back "no fulcral stars" without minting a Set per frame — the
 *  DeckLayer memo compares this by reference, and a fresh empty Set would break it every frame. */
export const NO_FULCRAL: ReadonlySet<number> = new Set<number>();

/**
 * The interior view's whole feature, in one walk: a node is drawn as a single lobe while its
 * footprint on screen is under `minSpanPx`, and defers to its children once it is wider. Cost is
 * O(visible nodes) rather than O(stars).
 *
 * A session that broke into more than one lobe also gets a halo and a mesh: the halo is the
 * atmosphere around it, the mesh is its skeleton. A session that *is* a single lobe gets neither —
 * a halo behind one lobe only draws the same blob twice, and a mesh needs two ends.
 *
 * The mesh joins lobes of **one session only**, never across the moat between two of them. A graph
 * that spanned sessions would draw joins the real link graph does not have, and the whole point of
 * the skeleton is to pre-figure the drawing about to emerge — not to invent a different one.
 */
export const cloudFrame = (clouds: Cloud[], zoom: number, view: Bounds, minSpanPx: number): CloudFrame => {
  if (!clouds.length) return EMPTY_CLOUD_FRAME;

  const lobes: Lobe[] = [];
  const halos: Cloud[] = [];
  const edges: MeshEdge[] = [];

  const walk = (lobe: Lobe) => {
    if (!boundsCross(lobe.box, view)) return; // the whole subtree is off screen
    if (spanPx(lobe, zoom) < minSpanPx || !lobe.children) {
      lobes.push(lobe);
      return;
    }
    for (const child of lobe.children) walk(child);
  };

  for (const cloud of clouds) {
    const before = lobes.length;
    walk(cloud.root);
    if (lobes.length - before > 1) {
      halos.push(cloud);
      // over this session's slice only — see above
      addMesh(
        lobes.slice(before).map((l) => ({ id: l.id, x: l.cx, y: l.cy, weight: l.weight })),
        cloud.gid,
        edges,
      );
    }
  }
  return { halos, lobes, edges };
};

/* ---------- the outer-view budget: what equalises a 1000-star deck against a 10-star one ---------- */

/** A node's footprint on screen, in px. Measured on the tight box, never the cell. */
const spanPx = (lobe: Lobe, zoom: number) =>
  Math.max(lobe.box.maxX - lobe.box.minX, lobe.box.maxY - lobe.box.minY) * zoom;

/** Whether a node stands in for its whole subtree at this collapse threshold. */
const collapses = (lobe: Lobe, zoom: number, span: number) =>
  lobe.n >= COLLAPSE_MIN_POINTS && spanPx(lobe, zoom) < span;

/** How many individual stars the group would show at this collapse threshold. */
const countShown = (lobe: Lobe, zoom: number, span: number): number => {
  if (collapses(lobe, zoom, span)) return 1; // the whole subtree becomes one fulcral star
  if (!lobe.children) return lobe.n;
  let total = 0;
  for (const child of lobe.children) total += countShown(child, zoom, span);
  return total;
};

/**
 * The collapse threshold, in screen px, grown geometrically until the group fits its budget.
 *
 * Two consequences worth internalising, because between them they *are* the feature:
 *
 * - A node only ever collapses if it holds at least COLLAPSE_MIN_POINTS. Pairs and singletons never
 *   agglomerate, which is exactly why a ten-star group stays a legible drawing at every zoom while
 *   a thousand-star one dissolves. The budget is not a cap on what is drawn, it is a pressure that
 *   only dense groups ever feel.
 * - Pulling back shrinks every span, so more nodes clear the base threshold on their own and this
 *   loop stops early; going in inflates spans, nodes stop clearing, groups split and stars return.
 *   There is no mode flag and no zoom threshold anywhere — the same expression produces every state,
 *   which is why the handover has nothing to pop at.
 */
const lodSpan = (root: Lobe, zoom: number, budget: number): number => {
  let span = STAR_SPACING_PX;
  for (let i = 0; i < LOD_SPAN_STEPS; i++) {
    if (countShown(root, zoom, span) <= budget) return span;
    span *= LOD_SPAN_GROWTH;
  }
  return span;
};

/** Every star id under a node, gathered from the leaves. */
const subtreeStarIds = (lobe: Lobe, out: number[]): number[] => {
  if (lobe.starIds) out.push(...lobe.starIds);
  else if (lobe.children) for (const child of lobe.children) subtreeStarIds(child, out);
  return out;
};

export type GroupLod = {
  gid: number;
  /**
   * Which stars survive. **null means every one of them** — the group is under budget, so there is
   * nothing to decide and no cloud to draw. A ten-star group is null at every zoom, forever.
   */
  show: Set<number> | null;
  /** Survivors that stand in for a collapsed group, drawn larger because they carry more meaning. */
  fulcral: ReadonlySet<number>;
  lobes: Lobe[];
  /** Skeleton over the survivors — the coarse stand-in for the real link graph. */
  edges: MeshEdge[];
  /** The group's own atmosphere, drawn only once something has actually been absorbed. */
  halo: Lobe | null;
  /**
   * How much of the group is hidden inside clouds, 0..1. The halo and the lobes fade on this rather
   * than on a zoom threshold, which is what stops the handover having a moment where it pops.
   */
  veil: number;
};

/** The low-rank crowd the gap fill draws from (guide §6.3 step 5: rank ≤ 1). */
const lowRank = (mastery: number) => rankOf(mastery) <= 1;

/**
 * Which of a group's stars survive at this zoom, and what stands in for the rest.
 *
 * The premise: a group gets a fixed budget of individual stars on screen, regardless of how many it
 * actually has. If it needs more than the budget, groups of stars collapse — each collapsed group
 * becoming one cloud lobe plus one surviving *fulcral* star, its most central member. The budget is
 * the whole reason a deck of a thousand cards and a deck of ten read as comparable objects instead
 * of a smear beside a speck.
 *
 * `members` must be the group's stars in id order, and `zoom` px per unit of the space they are
 * expressed in — deck-local for a deck's tree, which is the same scale as world since decks are
 * placed by translation alone.
 */
export const groupLod = (
  cloud: Cloud,
  members: Star[],
  byId: Map<number, Star>,
  zoom: number,
  budget: number,
): GroupLod => {
  const gid = cloud.gid;
  // under budget: nothing to collapse, nothing to stand in for anything. The common case for every
  // small group at every zoom, and it costs one comparison.
  if (members.length <= budget) {
    return { gid, show: null, fulcral: NO_FULCRAL, lobes: [], edges: [], halo: null, veil: 0 };
  }

  const show = new Set<number>();
  const fulcral = new Set<number>();

  // 1 · PEAK QUOTA — a spread of the group's highest-rank stars always survives (guide §6.3's gold
  // quota, generalised to "the highest rank actually present" so a young group holding no gold still
  // gets its brightest members). Evenly sampled by index, so they spread across the field instead of
  // clumping into whichever corner holds the mastered cards.
  let top = 0;
  for (const s of members) top = Math.max(top, rankOf(s.mastery));
  const peaks = members.filter((s) => rankOf(s.mastery) === top);
  const cap = Math.min(peaks.length, Math.max(2, Math.round(budget * PEAK_QUOTA)));
  const step = Math.max(1, Math.floor(peaks.length / cap));
  for (let i = 0, taken = 0; i < peaks.length && taken < cap; i += step, taken++) {
    show.add(peaks[i].id);
    fulcral.add(peaks[i].id);
  }

  // 2 · the collapse threshold, against whatever budget the quota left
  const span = lodSpan(cloud.root, zoom, Math.max(COLLAPSE_MIN_POINTS, budget - show.size));

  // 3/4 · walk, collecting the nodes that stand in for their subtrees and the stars that do not
  const lobes: Lobe[] = [];
  let absorbed = 0;
  const walk = (lobe: Lobe) => {
    if (!collapses(lobe, zoom, span)) {
      if (lobe.children) {
        for (const child of lobe.children) walk(child);
        return;
      }
      // a leaf too sparse or too wide to collapse shows every star it holds
      if (lobe.starIds) for (const id of lobe.starIds) show.add(id);
      return;
    }

    // the fulcral star: the member nearest the node's centroid, so the survivor sits where the
    // group's mass actually is rather than wherever its lowest id happens to be
    const ids = subtreeStarIds(lobe, []);
    let best = -1;
    let bestD = Infinity;
    for (const id of ids) {
      const star = byId.get(id);
      if (!star) continue;
      const d = (star.x - lobe.cx) ** 2 + (star.y - lobe.cy) ** 2;
      // ties on the lower id, so the choice cannot depend on the order the leaves were gathered in
      if (d < bestD || (d === bestD && id < best)) {
        bestD = d;
        best = id;
      }
    }
    if (best >= 0) {
      show.add(best);
      fulcral.add(best);
    }
    absorbed += lobe.n - 1;
    lobes.push(lobe);
  };
  walk(cloud.root);

  // 5 · GAP FILL. Admit low-level stars that sit in the empty stretches, so the group still reads as
  // a continuous field rather than as a ring of blobs. Skipping this is the single most common way to
  // make agglomeration look broken: survivors cluster where the density is and the gaps go bare.
  //
  // Walked in a strided order rather than sequentially, so the admitted stars are spread through the
  // group's index space instead of being taken from whichever end the array starts at. The spacing
  // test runs through a spatial hash — pairwise against the survivors it was O(candidates ×
  // survivors), which was most of the frame at deep zooms.
  const reachW = (STAR_SPACING_PX * GAP_FILL_SPACING) / zoom;
  const reach2 = reachW * reachW;
  const taken = new SpatialGrid<Star>(Math.max(1, reachW));
  for (const id of show) {
    const star = byId.get(id);
    if (star) taken.insert(star, pointBox(star, 0));
  }
  const room = Math.max(4, Math.round(budget * GAP_FILL_QUOTA));
  const low = members.filter((s) => lowRank(s.mastery) && !show.has(s.id));
  for (let j = 0, added = 0; j < low.length && added < room; j++) {
    const star = low[(j * 7) % low.length];
    if (show.has(star.id)) continue;
    if (taken.some(pointBox(star, reachW), (other) => dist2(star, other) < reach2)) continue;
    show.add(star.id);
    fulcral.add(star.id);
    taken.insert(star, pointBox(star, 0));
    added += 1;
  }

  // 6 · The skeleton, over the **fulcral** stars — the survivors that stand in for something hidden.
  // Those are exactly the points whose real links vanished with their neighbours, so a coarse graph
  // over them takes the missing drawing's place at the same visual weight; the ordinary survivors
  // still carry their real links and need nothing. Built on the stars themselves rather than on the
  // lobes, so its endpoints are the very points the fine graph returns to as groups split.
  // ...and only while something is actually hidden: with no collapsed node the real graph is whole,
  // and a skeleton on top of it would be structure standing in for nothing.
  const edges: MeshEdge[] = [];
  if (lobes.length) {
    const fulcralStars: Star[] = [];
    for (const id of fulcral) {
      const star = byId.get(id);
      if (star) fulcralStars.push(star);
    }
    addMesh(
      fulcralStars.map((s) => ({ id: `${s.id}`, x: s.x, y: s.y, weight: cloud.root.weight })),
      gid,
      edges,
    );
  }

  // the halo is tied to how much is actually hidden, so a group that has collapsed nothing has none
  // and it fades in continuously as groups fold. There is no threshold to cross all at once.
  const veil = Math.min(1, absorbed / Math.max(1, 0.5 * members.length));
  return { gid, show, fulcral, lobes, edges, halo: lobes.length ? cloud.root : null, veil };
};

