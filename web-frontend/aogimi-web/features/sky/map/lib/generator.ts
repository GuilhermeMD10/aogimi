import {
  DEFAULT_SEED,
  EDGE_CLEARANCE,
  FIELD_ASPECT,
  GRID_CELL,
  GROUP_CLEARANCE,
  GROWTH_MIN,
  LINK_REACH,
  MAX_RETRIES,
  MIN_DISTANCE,
  RADIUS_SPAN,
  SAFETY_ZONE_LIMIT,
  SEEDS_PER_ZONE,
  SEED_CLEARANCE,
} from './config';
import type { CardContent } from './cards';
import { ORIGIN, dist2, pointToSegment, segmentsCross } from './geometry';
import { SpatialGrid, pointBox, segmentBox } from './grid';
import { type Rng, streamFor } from './rng';
import type { Constellation, Deck, Link, Point, SkySnapshot, Star } from './types';

/**
 * The open session of a deck, or of the sky when no deck is named. A session belongs to exactly one
 * deck, so each deck carries its own open one — cards arriving into two decks at the same moment are
 * two sessions, not one straddling both.
 */
export const openConstellationOf = (constellations: Constellation[], did?: number) =>
  constellations.find((c) => !c.sealed && (did === undefined || c.did === did));

/**
 * The newest star of an open session, or null when nothing is open.
 *
 * Here rather than in the renderer because it rests on two of this file's own invariants — stars
 * are append-only, and the newest one always belongs to a session still taking cards — which a
 * component can read but cannot enforce.
 */
export const openTipOf = (stars: Star[], constellations: Constellation[]): Star | null => {
  const open = openConstellationOf(constellations);
  if (!open?.starIds.length) return null;
  const last = open.starIds[open.starIds.length - 1];
  return stars.find((s) => s.id === last) ?? null;
};

/** A link with its endpoints resolved, which is all the geometry checks ever need. */
type Segment = { a: Star; b: Star; cid: number; did: number };

/** No star further than this can break either spacing floor, so it bounds the spacing query. */
const SPACING_REACH = Math.max(MIN_DISTANCE, GROUP_CLEARANCE);

/**
 * A seed wants SEED_CLEARANCE of empty space, but it also becomes the first star of a new
 * group, so it may not land inside another group's moat either. Taking the larger of the two
 * keeps the GROUP_CLEARANCE floor true however the pair is tuned.
 */
const SEED_REACH = Math.max(SEED_CLEARANCE, GROUP_CLEARANCE);

// squared once here, since the spacing test runs more than anything else in the generator
const MIN_D2 = MIN_DISTANCE ** 2;
const GROUP_D2 = GROUP_CLEARANCE ** 2;
const SEED_D2 = SEED_REACH ** 2;

/**
 * The field's elliptical stretch: seeding zones are circles scaled by these, so a deck's territory
 * takes the shape of the container that frames it. Split as sqrt/1-over-sqrt so the product is 1 —
 * a zone keeps exactly the area a circular one had, and with it the seed density every clearance
 * was tuned against. Only where a *session starts* is stretched; growth within one stays isotropic,
 * so the constellations themselves are not distorted.
 */
const FIELD_SCALE_X = Math.sqrt(FIELD_ASPECT);
const FIELD_SCALE_Y = 1 / Math.sqrt(FIELD_ASPECT);

/**
 * One deck's own patch of sky, in **deck-local** coordinates, growing outward from its own origin.
 *
 * Every placement rule is confined to one of these, which is what makes deck separation structural
 * rather than tuned: two decks cannot crowd each other because no query in the generator can see
 * from one field into another. Where the fields end up relative to one another is decided later and
 * elsewhere, by the packer in `layout.ts`, from the extent each field turned out to have.
 */
class DeckField {
  /** What the panel calls this deck. A neutral placeholder until the host calls `nameDeck`; a
   *  hydrate restores whatever the stored sky called it, so a host-given name survives a reload. */
  name = '';
  /** Members in id order, which is the order placeGrowth draws a sprout point from. */
  members = new Map<number, Star[]>();
  starGrid = new SpatialGrid<Star>(GRID_CELL);
  linkGrid = new SpatialGrid<Segment>(GRID_CELL);
  /** Which annulus the next new session seeds into, and how many have gone into it so far. */
  zone = 1;
  seededInZone = 0;
  cids: number[] = [];
  starCount = 0;
}

/**
 * Grows a sky one card at a time. Deliberately free of React: it owns mutable arrays and
 * is read through `snapshot()`, so a burst (a tight loop of adds) always sees fresh data
 * instead of the stale copy a re-render would hand it.
 *
 * Randomness is per card, not per sky: each card places from a stream keyed on the seed, its deck
 * and its own identity, so where it lands does not depend on how many cards came before it or on
 * how many retries any of them needed. That is what makes a sky loadable — see `hydrate` and
 * `streamFor`. The host's bucket string decides grouping (Aogimi: the card's UTC creation day).
 *
 * The deck's **key** — its immutable uuid, not its render-local `did` — is part of the stream key
 * because it is part of the card's identity, and because leaving it out would make every deck a
 * clone of every other: two decks' first cards would draw the same candidate positions in their
 * own local spaces and land in the same place. It must be the uuid: `did` is allowed to differ
 * between hosts of the same sky (deck details numbers its one deck 0; the full map numbers decks
 * by position), and a position must never depend on which page is rendering it.
 *
 * Every placement rule is short-range: nothing beyond SPACING_REACH, SEED_CLEARANCE or
 * LINK_REACH of a candidate can reject it. Two spatial hashes per deck exploit that, so validating
 * a candidate costs a constant number of tests rather than a sweep of the whole deck, and growing a
 * sky is linear in its size instead of quadratic. The rules themselves are untouched: each query is
 * a superset of what could possibly reject, and the exact geometry still decides.
 */
export class SkyGenerator {
  /** Append-only and in id order, which is the order every reader walks and no writer may disturb. */
  private stars: Star[] = [];
  private segments: Segment[] = [];
  private constellations: Constellation[] = [];
  private fields = new Map<number, DeckField>();
  /** Lets a click reach the live star behind the copy it was handed. */
  private byId = new Map<number, Star>();
  private byCid = new Map<number, Constellation>();
  private nextStarId = 0;
  private nextCid = 0;
  private seedText: string;
  private rng: Rng;

  constructor(seed: string = DEFAULT_SEED) {
    this.seedText = seed;
    // replaced per card in addStar; this only keeps the field defined before the first one lands
    this.rng = streamFor(seed, '');
  }

  /** How many stars the sky holds, without paying for a snapshot. */
  get starCount(): number {
    return this.stars.length;
  }

  /** How many cards a deck holds, for a caller deciding where to mine next. */
  deckCount(did: number): number {
    return this.fields.get(did)?.starCount ?? 0;
  }

  /* ---------- reading ---------- */

  snapshot(): SkySnapshot {
    return {
      // the stars themselves are copied, not just the array: `count` is mutated in place, and
      // sharing the objects would let a bump show up inside a snapshot already handed out
      stars: this.stars.map((s) => ({ ...s })),
      links: this.segments.map((s): Link => ({ a: s.a.id, b: s.b.id, cid: s.cid, did: s.did })),
      // starIds must be copied too: the generator keeps appending to the live array,
      // and a snapshot that aliases it would silently grow after being handed out
      constellations: this.constellations.map((c) => ({ ...c, starIds: [...c.starIds] })),
      decks: [...this.fields.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, f]): Deck => ({ id, name: f.name, cids: [...f.cids], starCount: f.starCount })),
    };
  }

  private fieldFor(did: number): DeckField {
    let field = this.fields.get(did);
    if (!field) {
      field = new DeckField();
      // a plain placeholder rather than a name drawn from the seed: the host owns deck names and
      // calls nameDeck, and a generated one would only be a string it has to notice and overwrite.
      // Nothing here touches the rng — a deck springing into existence mid-placement must not shift
      // where the card that created it lands.
      field.name = `Deck ${did}`;
      this.fields.set(did, field);
    }
    return field;
  }

  /** Call this deck what the host calls it. Creates the deck if it does not exist yet. */
  nameDeck(did: number, name: string) {
    this.fieldFor(did).name = name;
  }

  /**
   * Nearest member of `cid` to p, in deck-local space. The candidate was sprouted at most
   * LINK_REACH from a member, so the nearest one cannot be further than that. Ties go to the lower
   * id, which keeps the answer independent of the order the grid happens to hand cells back in.
   */
  private nearestMember(field: DeckField, p: Point, cid: number): Star | null {
    let best: Star | null = null;
    let bestD = Infinity;
    field.starGrid.forEach(pointBox(p, LINK_REACH), (s) => {
      if (s.cid !== cid) return;
      const d = dist2(s, p);
      if (d < bestD || (d === bestD && best !== null && s.id < best.id)) {
        best = s;
        bestD = d;
      }
    });
    return best;
  }

  /**
   * Load a stored sky, placing nothing. Everything the generator works from is derived — the spatial
   * grids, the member lists, the id counters, each deck's frontier zone — so the only thing that has
   * to survive a reload is the stars and their links.
   *
   * With per-card streams this is exact: cards mined after a reload land precisely where an
   * unbroken run would have put them, because there is no stream cursor to have lost.
   *
   * Wipes whatever was here first, so it is a load and not a merge.
   */
  hydrate(snap: SkySnapshot) {
    this.reset(this.seedText);

    // names first: a stored sky may call a deck something its seed would not have
    for (const d of snap.decks) {
      if (d.name) this.fieldFor(d.id).name = d.name;
    }

    for (const s of snap.stars) {
      const star = { ...s };
      this.stars.push(star);
      this.byId.set(star.id, star);
      const field = this.fieldFor(star.did);
      field.starGrid.insert(star, pointBox(star, 0));
      field.starCount += 1;
      const members = field.members.get(star.cid);
      if (members) members.push(star);
      else field.members.set(star.cid, [star]);
      this.nextStarId = Math.max(this.nextStarId, star.id + 1);
    }

    for (const l of snap.links) {
      const a = this.byId.get(l.a);
      const b = this.byId.get(l.b);
      if (!a || !b) continue; // a link to a card that is gone is simply not a link
      const segment: Segment = { a, b, cid: l.cid, did: l.did };
      this.segments.push(segment);
      this.fieldFor(l.did).linkGrid.insert(segment, segmentBox(a, b, 0));
    }

    for (const c of snap.constellations) {
      const copy = { ...c, starIds: [...c.starIds] };
      this.constellations.push(copy);
      this.byCid.set(copy.id, copy);
      this.fieldFor(copy.did).cids.push(copy.id);
      this.nextCid = Math.max(this.nextCid, copy.id + 1);
    }

    // Each deck's frontier: which annulus its next new session seeds into. Read back from where the
    // existing seeds actually sit rather than recomputed from their count, so a zone the search once
    // skipped past as saturated is not re-entered and slowly refilled.
    for (const field of this.fields.values()) {
      let zone = 1;
      let seeded = 0;
      for (const cid of field.cids) {
        const c = this.byCid.get(cid);
        const seed = c && this.byId.get(c.starIds[0]);
        if (!seed) continue;
        // undo the field's stretch, so the ring read back is the one the seed was drawn in
        const z = Math.max(1, Math.ceil(Math.hypot(seed.x / FIELD_SCALE_X, seed.y / FIELD_SCALE_Y) / RADIUS_SPAN));
        if (z > zone) {
          zone = z;
          seeded = 0;
        }
        if (z === zone) seeded += 1;
      }
      field.zone = zone;
      field.seededInZone = seeded;
    }
  }

  /* ---------- validity ---------- */

  /** Spacing: MIN_DISTANCE from your own group, GROUP_CLEARANCE from every other in this deck. */
  private spacingOk(field: DeckField, p: Point, cid: number) {
    return !field.starGrid.some(
      pointBox(p, SPACING_REACH),
      (s) => dist2(s, p) < (s.cid === cid ? MIN_D2 : GROUP_D2),
    );
  }

  /** A star may not sit on top of an existing link. */
  private clearOfLinks(field: DeckField, p: Point) {
    return !field.linkGrid.some(
      pointBox(p, EDGE_CLEARANCE),
      (l) => pointToSegment(p, l.a, l.b) < EDGE_CLEARANCE,
    );
  }

  /**
   * The candidate's single new link must not cross any existing link, and must not
   * graze a star that isn't one of its own endpoints.
   */
  private linkOk(field: DeckField, p: Point, anchor: Star) {
    // segments can only cross inside the overlap of their boxes, so the new link's own box
    // is enough to catch every existing link that could cross it
    const crosses = field.linkGrid.some(
      segmentBox(p, anchor, 0),
      (l) => l.a !== anchor && l.b !== anchor && segmentsCross(p, anchor, l.a, l.b),
    );
    if (crosses) return false;

    return !field.starGrid.some(
      segmentBox(p, anchor, EDGE_CLEARANCE),
      (s) => s !== anchor && pointToSegment(s, p, anchor) < EDGE_CLEARANCE,
    );
  }

  /* ---------- sampling ---------- */

  /**
   * Seed a new constellation in this deck's frontier zone. There is no outer edge: if a zone
   * has no free angles left, the search steps to the next ring out, forever.
   */
  private placeSeed(field: DeckField): Point | null {
    if (field.starCount === 0) return ORIGIN;

    while (field.zone < SAFETY_ZONE_LIMIT) {
      if (field.seededInZone >= SEEDS_PER_ZONE * field.zone) {
        field.zone += 1;
        field.seededInZone = 0;
        continue;
      }
      const n = field.zone;
      const rInner = (n - 1) * RADIUS_SPAN;
      const rOuter = n * RADIUS_SPAN;

      for (let i = 0; i < MAX_RETRIES; i++) {
        const a = this.rng() * Math.PI * 2;
        const r = Math.sqrt(rInner ** 2 + this.rng() * (rOuter ** 2 - rInner ** 2));
        const p = { x: Math.cos(a) * r * FIELD_SCALE_X, y: Math.sin(a) * r * FIELD_SCALE_Y };
        if (field.starGrid.some(pointBox(p, SEED_REACH), (s) => dist2(s, p) < SEED_D2)) continue;
        if (!this.clearOfLinks(field, p)) continue;
        field.seededInZone += 1;
        return p;
      }
      // no free angles at this radius, so try the next ring out
      field.zone += 1;
      field.seededInZone = 0;
    }
    return null; // unreachable outside pathological constants
  }

  /**
   * Grow the open constellation: pick a member as a sprout point and place nearby.
   * No size cap and no boundary, so a long session sprawls as far as it needs,
   * flowing around whatever is already in the way.
   */
  private placeGrowth(field: DeckField, cid: number): { pos: Point; anchor: Star } | null {
    const members = field.members.get(cid);
    if (!members?.length) return null;

    for (let i = 0; i < MAX_RETRIES; i++) {
      const from = members[Math.floor(this.rng() * members.length)];
      const a = this.rng() * Math.PI * 2;
      const r = GROWTH_MIN + this.rng() * (LINK_REACH - GROWTH_MIN);
      const pos = { x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r };

      if (!this.spacingOk(field, pos, cid) || !this.clearOfLinks(field, pos)) continue;

      // link to the nearest member, which is not always the one we sprouted from.
      // `from` itself is in reach, so this never comes back empty.
      const anchor = this.nearestMember(field, pos, cid);
      if (!anchor || !this.linkOk(field, pos, anchor)) continue;

      return { pos, anchor };
    }
    return null;
  }

  /* ---------- the only rule: the bucket ---------- */

  /**
   * Mine one card into a deck. Returns false only if the deck somehow has nowhere left to put it.
   *
   * `bucket` is the grouping key — one constellation per distinct value, in feed order (Aogimi:
   * the card's UTC creation day). A card whose bucket differs from the deck's open constellation
   * seals it and starts the next, which is why cards MUST be fed in chronological order: an
   * out-of-order card cannot rejoin a day the bucket change already closed.
   *
   * `key` is the card's immutable identity — its uuid — and, with `deckKey`, what this star's
   * placement is drawn from. `did` is only the render-local deck index (layout, indexing, draw
   * grouping); it carries no placement weight, so hosts may number decks differently.
   *
   * `card` is everything behind the star — faces, rank, review count — from the host's own card.
   * Required: there is no placeholder path, so the sky can only ever show what the host has.
   */
  addStar(args: { bucket: string; key: string; did: number; deckKey: string; card: CardContent }): boolean {
    const { bucket, key, did, deckKey, card } = args;
    // the deck is part of the card's identity, so it is part of the stream key — without it every
    // deck would place its nth card at the same local position and read as a copy of every other.
    // The uuid, never `did`: see the class comment.
    this.rng = streamFor(this.seedText, `${deckKey}/${key}`);
    const field = this.fieldFor(did);
    let target = openConstellationOf(this.constellations, did);

    // a new bucket closes the old constellation — the day rolled over
    if (target && target.bucket !== bucket) {
      target.sealed = true;
      target = undefined;
    }

    const grown = target ? this.placeGrowth(field, target.id) : null;
    if (target && !grown) {
      target.sealed = true; // locally boxed in, so this day continues in a new group
      target = undefined;
    }

    let pos: Point;
    let anchor: Star | null = null;
    if (target && grown) {
      pos = grown.pos;
      anchor = grown.anchor;
    } else {
      const seeded = this.placeSeed(field);
      if (!seeded) return false;
      pos = seeded;
      target = { id: this.nextCid++, did, starIds: [], sealed: false, bucket };
      this.constellations.push(target);
      this.byCid.set(target.id, target);
      field.cids.push(target.id);
    }

    const star: Star = {
      id: this.nextStarId++,
      x: pos.x,
      y: pos.y,
      cid: target.id,
      did,
      key,
      front: card.front,
      back: card.back,
      mastery: card.mastery,
      // A host that doesn't model decay omits this; fully lit is the honest
      // default there, and it keeps the renderer free of null checks.
      glow: card.glow ?? 1,
      count: card.count,
      seen: false,
    };
    this.stars.push(star);
    this.byId.set(star.id, star);
    field.starGrid.insert(star, pointBox(star, 0));
    field.starCount += 1;

    const members = field.members.get(target.id);
    if (members) members.push(star);
    else field.members.set(target.id, [star]);

    target.starIds.push(star.id);

    if (anchor) {
      const segment: Segment = { a: anchor, b: star, cid: target.id, did };
      this.segments.push(segment);
      field.linkGrid.insert(segment, segmentBox(anchor, star, 0));
    }
    return true;
  }

  /**
   * Count one more review of this star's card. Returns the new total, or null if no such star,
   * so the caller reports what actually landed rather than what it assumed.
   */
  bumpStar(id: number): number | null {
    const star = this.byId.get(id);
    if (!star) return null;
    star.count += 1;
    return star.count;
  }

  /**
   * Record that these stars have now been drawn for the reader, so they never pop again. Returns
   * how many actually changed, which lets the caller skip republishing when nothing did — the
   * renderer marks on a timer, and a snapshot per idle tick would be pure waste.
   */
  markSeen(ids: Iterable<number>): number {
    let changed = 0;
    for (const id of ids) {
      const star = this.byId.get(id);
      if (star && !star.seen) {
        star.seen = true;
        changed += 1;
      }
    }
    return changed;
  }

  /** The whole sky at once, for history that arrived already read rather than as news. */
  markAllSeen(): number {
    let changed = 0;
    for (const star of this.stars) {
      if (!star.seen) {
        star.seen = true;
        changed += 1;
      }
    }
    return changed;
  }

  /**
   * Seal every open constellation whose bucket is not `bucket`, and report how many closed.
   *
   * After a replay, each deck's *last* day is left open — the bucket rule only seals on the next
   * card's arrival, which for the newest day never came. That is right when the last day is today
   * (the reach ring shows where today's next card will grow) and wrong for any older day, which
   * can never take another card. Call this with today's bucket after mining; per deck, so one
   * deck studied today keeps its ring while a deck last touched on Tuesday loses its stale one.
   */
  sealStale(bucket: string): number {
    let closed = 0;
    for (const c of this.constellations) {
      if (c.sealed || c.bucket === bucket) continue;
      c.sealed = true;
      closed += 1;
    }
    return closed;
  }

  /**
   * Close every open session by hand, and report how many there were. Every deck can have one open
   * at once, so this is a count rather than a boolean — sealing "the" open session stopped being a
   * meaningful act the moment a sky held more than one deck.
   */
  sealOpen(): number {
    let closed = 0;
    for (const c of this.constellations) {
      if (c.sealed) continue;
      c.sealed = true;
      closed += 1;
    }
    return closed;
  }

  /** Wipe the sky and rewind the random stream, so the same seed replays the same sky. */
  reset(seed: string) {
    this.stars = [];
    this.segments = [];
    this.constellations = [];
    this.fields.clear();
    this.byId.clear();
    this.byCid.clear();
    this.nextStarId = 0;
    this.nextCid = 0;
    this.seedText = seed;
    this.rng = streamFor(seed, '');
  }
}
