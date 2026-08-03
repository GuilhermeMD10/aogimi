import {
  type Cloud,
  EMPTY_CLOUD_FRAME,
  type Lobe,
  type MeshEdge,
  NO_FULCRAL,
  buildClouds,
  cloudFrame,
  groupLod,
} from './cluster';
import {
  DECK_MASS_MAX,
  DECK_MASS_MIN,
  DECK_PREVIEW_BUDGET,
  LOBE_SPAN_PX,
  SKY_STAR_BUDGET,
} from './config';
import { boundsCross, inBounds, segmentInBounds, skyBounds } from './geometry';
import type { SkyLayout } from './layout';
import { MIN_LAYER_OP, SKY_FULL, type SkyLayers, type SkyPhase, layersAt } from './lod';
import type { RankRamp } from './palette';
import type { Bounds, FocusPath, Point, SkySnapshot, Star } from './types';

/**
 * Which tier of the sky is being looked at, and therefore what is drawn.
 *
 * Two tiers, and they run on **different mechanisms on purpose**:
 *
 * - **The outer view** runs each deck through the star budget (`groupLod`): one form, a coarse
 *   skeleton, and just enough stars to show what shape the deck is. The budget is what equalises a
 *   1000-card deck against a 10-card one — a zoom threshold out here would bury the small deck and
 *   smear the big one at the same moment.
 * - **Inside a focused deck** the unit is a session and zoom is honest again, so the view runs the
 *   zoom-band crossfade (`cloudFrame` + `layersAt`): per-session quadtrees, lobes that split as they
 *   earn pixels, a per-session mesh over the lobes, and the cloud / line / star layers fading with
 *   the gesture. Every join the mesh draws stays inside one session — the interior never invents an
 *   edge between two constellations, which a deck-wide graph inevitably does and which reads as the
 *   real drawings being rewired.
 *
 * Nothing here knows about SVG, or about how big a star is drawn. It decides *what is drawn*; the
 * renderer decides what that looks like.
 */

/** A link with its endpoints resolved and its world length, neither of which the camera changes. */
export type DrawnLink = { a: Star; b: Star; cid: number; len: number };

/**
 * The data-only half: everything derivable from a snapshot and nothing that depends on the camera.
 * Memoise this against the snapshot and it survives every frame of a gesture.
 */
export type SkyIndex = {
  byId: Map<number, Star>;
  byDeck: Map<number, Star[]>;
  linksByDeck: Map<number, DrawnLink[]>;
  /** One tree spanning each whole deck — what the outer view's budget runs over. */
  deckTrees: Map<number, Cloud>;
  /** One tree per session, grouped by the deck that owns them — what a focused deck's walk reads. */
  sessionTrees: Map<number, Cloud[]>;
  /** Each deck's tight box in its own local space, which is what the packer lays out. */
  localBoxes: Map<number, Bounds>;
  /** Deck names by did — the one non-geometric input the packer needs: a name floors its deck's
   *  frame width, and the frame footprint is what sizes the grid's cells. */
  names: Map<number, string>;
};

/** `ranks` is the active hue preset's ramp: the trees carry each node's blended tint, so the index
 *  depends on the palette as well as on the data. See buildClouds. */
export const indexSky = (snap: SkySnapshot, ranks: RankRamp): SkyIndex => {
  const byId = new Map<number, Star>();
  for (const s of snap.stars) byId.set(s.id, s);

  const byDeck = new Map<number, Star[]>();
  for (const s of snap.stars) {
    const deck = byDeck.get(s.did);
    if (deck) deck.push(s);
    else byDeck.set(s.did, [s]);
  }

  // a link's length never changes once it exists, so it is not worth a hypot per link per frame
  const linksByDeck = new Map<number, DrawnLink[]>();
  for (const l of snap.links) {
    const a = byId.get(l.a);
    const b = byId.get(l.b);
    if (!a || !b) continue;
    const drawn: DrawnLink = { a, b, cid: l.cid, len: Math.hypot(a.x - b.x, a.y - b.y) };
    const list = linksByDeck.get(l.did);
    if (list) list.push(drawn);
    else linksByDeck.set(l.did, [drawn]);
  }

  const dids = snap.decks.map((d) => d.id);
  const localBoxes = new Map<number, Bounds>();
  for (const did of dids) {
    const stars = byDeck.get(did);
    if (stars?.length) localBoxes.set(did, skyBounds(stars, 0, 0));
  }

  const names = new Map<number, string>();
  for (const d of snap.decks) names.set(d.id, d.name);

  const deckTrees = new Map<number, Cloud>();
  for (const cloud of buildClouds(snap.stars, dids, (s) => s.did, ranks)) deckTrees.set(cloud.gid, cloud);

  // in constellation order, so a deck's sessions draw in the order they were studied
  const sessionTrees = new Map<number, Cloud[]>();
  const deckOfCid = new Map<number, number>();
  for (const c of snap.constellations) deckOfCid.set(c.id, c.did);
  for (const cloud of buildClouds(
    snap.stars,
    snap.constellations.map((c) => c.id),
    (s) => s.cid,
    ranks,
  )) {
    const did = deckOfCid.get(cloud.gid);
    if (did === undefined) continue;
    const list = sessionTrees.get(did);
    if (list) list.push(cloud);
    else sessionTrees.set(did, [cloud]);
  }

  return { byId, byDeck, linksByDeck, deckTrees, sessionTrees, localBoxes, names };
};

/** Everything one deck contributes to a frame, in that deck's own local coordinates. */
export type DeckDraw = {
  did: number;
  /** Add this to any coordinate below to get world. The renderer applies it as one transform. */
  origin: Point;
  focused: boolean;
  /**
   * How strongly each layer is faded up. Inside a focused deck these come from the zoom crossfade
   * and the renderer must apply them; at the outer view they are all 1 — out there the budget does
   * the fading, through what exists rather than through opacity.
   */
  layers: SkyLayers;
  stars: Star[];
  /** Outer view only: survivors standing in for a collapsed group, drawn larger. Empty inside. */
  fulcral: ReadonlySet<number>;
  /** Real links, drawn only where both endpoints are drawn. */
  links: DrawnLink[];
  /** Clouds standing in for what is not. */
  lobes: Lobe[];
  /** The skeleton. Per-session over its lobes inside a deck; over the survivors at the outer view. */
  edges: MeshEdge[];
  /** Halos, each with the strength it is faded in at. */
  halos: { lobe: Lobe; veil: number }[];
  /**
   * Focused deck only, while its star layer is down: a budget's worth of real stars drawn among the
   * clouds — the peak quota, the fulcral stand-ins, the gap fill — so the condensed interior reads
   * as a sky rather than as a field of points. `op` is `1 − starOp`: the preview is fully up until
   * the crossfade begins and exactly gone when the full drawing has landed, so the survivors (which
   * the full layer also contains) hand over to themselves without a seam.
   */
  preview: { stars: Star[]; fulcral: ReadonlySet<number>; op: number } | null;
  /**
   * How the deck's forms are sized against the sky's busiest deck, DECK_MASS_MIN..MAX. The outer
   * view's answer to "which of these is the big one" being readable at a glance; 1 inside a deck,
   * where the forms already sit exactly where its own stars are.
   */
  mass: number;
  veil: number;
};

export type SkyFrame = {
  decks: DeckDraw[];
  phase: SkyPhase;
  veil: number;
  starCount: number;
  lobeCount: number;
};

const EMPTY_FRAME: SkyFrame = { decks: [], phase: 'hidden', veil: 0, starCount: 0, lobeCount: 0 };

/** A world box expressed in one deck's local space. */
const toLocalBox = (b: Bounds, origin: Point): Bounds => ({
  minX: b.minX - origin.x,
  minY: b.minY - origin.y,
  maxX: b.maxX - origin.x,
  maxY: b.maxY - origin.y,
});

/**
 * The outer view's reading of one deck: the budget decides which stars survive, a coarse skeleton
 * joins the survivors, and clouds stand in for the rest. Culling happens after the budget — the
 * budget is a statement about the deck as a whole, so what survives cannot depend on the view; only
 * what is drawn can.
 */
const drawOuterDeck = (
  index: SkyIndex,
  did: number,
  origin: Point,
  zoom: number,
  worldView: Bounds,
  mass: number,
): DeckDraw | null => {
  const stars = index.byDeck.get(did);
  const tree = index.deckTrees.get(did);
  if (!stars?.length || !tree) return null;

  const lod = groupLod(tree, stars, index.byId, zoom, SKY_STAR_BUDGET);
  const survives = (s: Star) => lod.show === null || lod.show.has(s.id);

  const view = toLocalBox(worldView, origin);
  return {
    did,
    origin,
    focused: false,
    layers: SKY_FULL,
    stars: stars.filter((s) => survives(s) && inBounds(s, view)),
    fulcral: lod.fulcral,
    // both endpoints, per the rule that a real edge cannot outlive the stars it joins
    links: (index.linksByDeck.get(did) ?? []).filter(
      (l) => survives(l.a) && survives(l.b) && segmentInBounds(l.a, l.b, view),
    ),
    lobes: lod.lobes.filter((l) => boundsCross(l.box, view)),
    edges: lod.edges.filter((e) => segmentInBounds({ x: e.ax, y: e.ay }, { x: e.bx, y: e.by }, view)),
    halos: lod.halo && boundsCross(lod.halo.box, view) ? [{ lobe: lod.halo, veil: lod.veil }] : [],
    preview: null,
    mass,
    veil: lod.veil,
  };
};

/**
 * The interior of the focused deck: the zoom-band crossfade over per-session trees. Each layer is
 * skipped outright below the floor rather than drawn transparent, which is what guarantees there is
 * not a single star element in the document while the deck is all cloud.
 */
const drawFocusedDeck = (
  index: SkyIndex,
  did: number,
  origin: Point,
  zoom: number,
  worldView: Bounds,
): DeckDraw | null => {
  const stars = index.byDeck.get(did);
  if (!stars?.length) return null;

  const layers = layersAt(zoom);
  const view = toLocalBox(worldView, origin);

  const { halos, lobes, edges } =
    layers.cloudOp > MIN_LAYER_OP
      ? cloudFrame(index.sessionTrees.get(did) ?? [], zoom, view, LOBE_SPAN_PX)
      : EMPTY_CLOUD_FRAME;

  // While the full star layer is down, a budget's worth of real stars stands among the clouds —
  // the outer view's mechanism, resized for a deck that now fills the viewport. Stars only: its
  // lobes would double the per-session clouds above, and its deck-wide skeleton is exactly the
  // constellation-rewiring graph the interior must never draw.
  let preview: DeckDraw['preview'] = null;
  const tree = index.deckTrees.get(did);
  if (layers.starOp < 1 && tree) {
    const lod = groupLod(tree, stars, index.byId, zoom, DECK_PREVIEW_BUDGET);
    const survives = (s: Star) => lod.show === null || lod.show.has(s.id);
    preview = {
      stars: stars.filter((s) => survives(s) && inBounds(s, view)),
      fulcral: lod.fulcral,
      op: 1 - layers.starOp,
    };
  }

  return {
    did,
    origin,
    focused: true,
    layers,
    stars: layers.starOp > MIN_LAYER_OP ? stars.filter((s) => inBounds(s, view)) : [],
    fulcral: NO_FULCRAL,
    links:
      layers.lineOp > MIN_LAYER_OP
        ? (index.linksByDeck.get(did) ?? []).filter((l) => segmentInBounds(l.a, l.b, view))
        : [],
    lobes,
    edges,
    // the interior halo rides the cloud layer's own fade; its per-halo strength is its weight,
    // which the renderer already folds in
    halos: halos.map((c) => ({ lobe: c.root, veil: layers.cloudOp })),
    preview,
    mass: 1,
    veil: layers.cloudOp,
  };
};

/**
 * What the whole sky draws at this focus and camera. Decks that merely happen to stay in frame keep
 * their outer-view treatment, so what you left behind is still the thing you left.
 */
export const skyFrame = (args: {
  index: SkyIndex;
  layout: SkyLayout;
  focus: FocusPath;
  zoom: number;
  /** The visible world rectangle, already grown by the cull margin. */
  view: Bounds;
  hidden?: boolean;
}): SkyFrame => {
  const { index, layout, focus, zoom, view, hidden } = args;
  if (hidden || !layout.places.size) return EMPTY_FRAME;

  const focusedDid = focus.length ? focus[0] : null;
  const decks: DeckDraw[] = [];

  // the busiest deck anchors the mass scale, so the multiplier means the same thing on every sky
  let busiest = 1;
  for (const stars of index.byDeck.values()) busiest = Math.max(busiest, stars.length);

  for (const place of layout.places.values()) {
    const focused = place.did === focusedDid;
    // a deck outside the view contributes nothing, and testing its cell rather than its stars costs
    // one comparison instead of one per star
    if (!focused && !boundsCross(place.cell, view)) continue;

    const mass =
      DECK_MASS_MIN +
      (DECK_MASS_MAX - DECK_MASS_MIN) * Math.sqrt((index.byDeck.get(place.did)?.length ?? 0) / busiest);
    const draw = focused
      ? drawFocusedDeck(index, place.did, place.origin, zoom, view)
      : drawOuterDeck(index, place.did, place.origin, zoom, view, mass);
    if (draw) decks.push(draw);
  }

  let veil = 0;
  let starCount = 0;
  let lobeCount = 0;
  for (const d of decks) {
    veil += d.veil;
    starCount += d.stars.length;
    lobeCount += d.lobes.length;
  }
  if (decks.length) veil /= decks.length;

  const focusedDraw = decks.find((d) => d.focused);
  return {
    decks,
    // the focused deck's own reading when inside one; a veil reading of the chooser otherwise
    phase: focusedDraw ? focusedDraw.layers.phase : veil > 0.66 ? 'clouds' : veil > 0.02 ? 'crossing' : 'stars',
    veil,
    starCount,
    lobeCount,
  };
};
