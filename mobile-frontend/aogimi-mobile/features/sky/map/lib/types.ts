export type Point = { x: number; y: number };

/**
 * A star's x/y are **deck-local**, not world. World position is `deck origin + star position`,
 * which `lib/sky/layout.ts` resolves. Keeping them local is what makes a deck's own growth unable
 * to disturb its neighbours: the packer hands a growing deck a bigger cell, and nothing inside any
 * deck moves. It is also why clustering can never span two decks — the trees are built per deck,
 * in a space that only that deck occupies.
 *
 * `count` and `seen` are the two parts of a star the seed does not decide — placement reads
 * neither, so a sky stays reproducible however much it is clicked or looked at.
 *
 * `count` is how many times the card behind this star has been reviewed.
 *
 * `seen` is whether the star has ever actually been drawn for the reader. Cards arrive in the
 * background while the sky is closed or scrolled away, and a star that has not been shown yet is
 * owed its arrival: it pops in the first time it is genuinely on screen, not the moment it exists.
 * Being real state rather than a guess, it survives the star being unmounted and remounted by
 * culling — which no mount-triggered animation can tell apart from a card being mined.
 */
export type Star = {
  id: number;
  x: number;
  y: number;
  cid: number;
  /** The deck this star's card belongs to. Denormalised off its constellation because every render
   *  path needs it, and a lookup per star per frame is not worth the byte it saves. */
  did: number;
  /**
   * The card's immutable identity as the host named it — `addStar`'s `key`, i.e. the card's own
   * uuid. This is how a click on a star is joined back to the host's card row, and (with the deck
   * key) what the star's placement was drawn from. Never editable: a changed key is a moved star.
   */
  key: string;
  /**
   * The card behind the star: its two faces, and nothing else. Carried on the star rather than in a
   * parallel store because a star *is* a card — every reader of one wants the other, and a second
   * map keyed by id would only invent a join the data never needed. Neither is read by placement, so
   * a sky stays reproducible whatever its cards say.
   *
   * `front` is the card's identity everywhere it is named: the in-sky label, the list row, the
   * detail heading. There is deliberately no separate display name — a host's card model has a
   * front and a back, and a third string would be one the host has to invent.
   */
  front: string;
  back: string;
  /**
   * Mastery rank 0..3 — what the star is *drawn as*: its colour, its silhouette, its radius.
   * Comes from the host's own SRS ladder (new/met/learned/mastered), carried in on `addStar`
   * like the faces are. Placement never reads it, so a card climbing the ladder recolours its
   * star without moving it or any other.
   */
  mastery: number;
  /**
   * How brightly this star burns *now*, 0..1 — the host's retrievability, defaulted to 1 for a
   * host that doesn't model decay.
   *
   * The second axis of what a star says, and the reason rank alone wasn't enough: Aogimi's ladder
   * is monotonic above Learned, so a card the reader has let slip cannot be demoted to show it.
   * It dims instead. Same standing as `mastery` — drawn from, never placed from.
   */
  glow: number;
  count: number;
  seen: boolean;
};

export type Link = { a: number; b: number; cid: number; did: number }; // star ids, permanent once created

export type Constellation = {
  id: number;
  did: number;
  starIds: number[];
  sealed: boolean;
  /**
   * The grouping bucket every card in this constellation shares — the host's day string
   * (`YYYY-MM-DD`, UTC). A card arriving with a different bucket seals this constellation and
   * opens the next; `sealStale` closes it once its bucket is no longer today. The bucket is the
   * whole grouping rule: there is no time-gap seal any more.
   */
  bucket: string;
};

/**
 * A container of sessions, and the unit the outer view agglomerates. Named, because the panel lists
 * decks as things to enter and a list of anonymous forms is not a list. The sky itself still draws
 * forms, never words — the name lives in the chrome around it.
 *
 * It owns no coordinates. Where it sits in the world is decided by the packer in `layout.ts` from
 * the extent of its stars, and re-decided whenever that extent changes.
 */
export type Deck = { id: number; name: string; cids: number[]; starCount: number };

/** An immutable copy of the generator's state, safe to hold in React state. */
export type SkySnapshot = {
  stars: Star[];
  links: Link[];
  constellations: Constellation[];
  decks: Deck[];
};

/** Axis-aligned world-space box. The sky's own box is what pan is confined to. */
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** x,y is the world point sitting at the centre of the viewport; zoom is px per world unit. */
export type Camera = { x: number; y: number; zoom: number };

/**
 * The window onto the sky, in whatever px the host measures in. Not assumed square: a phone is
 * far taller than it is wide, and the camera maths handles either.
 */
export type Viewport = { width: number; height: number };

/**
 * How much of each viewport edge the host's overlays cover, in the same px the Viewport measures
 * in — a glass column on the left, a ledger along the bottom, a title above. The camera subtracts
 * these before fitting or confining, so "fitted" means centred in the *uncovered* window rather
 * than half-hidden under the chrome. Purely presentational: nothing about placement, layout or
 * what is drawn reads them, only where the camera comes to rest.
 */
export type Insets = { top: number; right: number; bottom: number; left: number };

/**
 * The world rectangle currently on screen. Kept as numbers rather than a ready-made SVG
 * viewBox string, because only one renderer wants that formatting and every renderer wants
 * the rectangle.
 */
export type View = {
  minX: number;
  minY: number;
  spanX: number; // world units across the viewport
  spanY: number;
  worldPerPx: number; // multiply a px measurement by this to keep it px-constant on screen
};

/**
 * Which tier of the sky is being looked at, as the path down to it: `[]` is every deck at once,
 * `[did]` is one deck's interior, `[did, cid]` one session inside that.
 *
 * A path rather than a mode enum, so adding a tier is adding an entry rather than a branch — the
 * same walk and the same budget mechanism, one level deeper. Two are reachable today.
 */
export type FocusPath = number[];
