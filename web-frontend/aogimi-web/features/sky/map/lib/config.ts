/**
 * Every tweakable in one place. Generation and presentation share a few of these — LINK_REACH is
 * both a growth limit and the radius of the session ring — so splitting them across files would
 * only make tuning harder.
 *
 * World units and screen px are different currencies here, and mixing them is the easiest
 * mistake to make: MIN_DISTANCE and friends are world units and never change, while STAR_PX and
 * HIT_PX are screen px and mean a different world distance at every zoom level.
 */

/* ---------- presentation ---------- */
/**
 * The shape of a deck's own field, as width over height. Seeding disperses constellations inside
 * elliptical zones of this aspect instead of circles, so a deck grows into roughly the shape of the
 * container that frames it and the fitted view fills that container instead of letterboxing a round
 * sky inside it.
 *
 * **A frozen generation constant, not a layout value.** It is written as a literal on purpose:
 * deriving it from whatever box the component happens to render in would make placement depend on
 * the viewport, and where a card lands must never depend on how wide the browser was when it was
 * mined. Changing this number re-shapes every sky generated afterwards while leaving every sky
 * generated before it alone — so pick it once, against the aspect the host will actually render at,
 * before the first real card is mined, and then never touch it.
 *
 * 1.45 is that pick, made against the deck-details container (the sky's primary home): its box
 * runs 1.18–1.56 across common viewports and sits at ~1.42 on the 1440/1600×900 band. Chosen
 * before the first real sky existed, per the rule above. The camera's `matchAspect` absorbs the
 * per-device remainder, so this only has to be *near* the truth, not exact.
 */
export const FIELD_ASPECT = 1.45;
export const STAR_PX = 3; // stars keep this pixel radius at any zoom level

/* ---------- camera ---------- */
// there is no MIN_ZOOM constant: the zoom-out floor is the sky's own fit zoom, so you can
// never pull back past the boundary. See fitZoom() in lib/sky/camera.ts.
export const MAX_ZOOM = 5; // px per world unit, zoomed all the way in
/**
 * Both of a focused deck's zoom limits adapt to how much sky the deck actually has — see
 * `focusLimits` in camera.ts, which resolves the pair from the deck's own box.
 *
 * **The resting fit** is capped at FOCUS_FIT_MAX_ZOOM rather than at MAX_ZOOM. Capped at MAX_ZOOM a
 * sparse deck's box covered only the middle of the free window and its handful of stars sat tiny in
 * an empty frame; the fill-the-window zoom is what the deck tier actually wants, since the box still
 * *contains* the whole deck at any fit by construction — nothing is ever cropped, it just stops
 * being pulled back further than the deck needs. FOCUS_FIT_MAX_ZOOM is the backstop that keeps a
 * one- or two-star deck from resting absurdly magnified.
 *
 * **The ceiling** is then `clamp(fit × FOCUS_ZOOM_HEADROOM, MAX_ZOOM, FOCUS_MAX_ZOOM)`, so there is
 * always somewhere further in to go: a dense deck (fit well under 1) keeps the MAX_ZOOM cap it
 * always had, and a sparse one resting at the FOCUS_FIT_MAX_ZOOM cap still has FOCUS_MAX_ZOOM above
 * it. Keep FOCUS_FIT_MAX_ZOOM × FOCUS_ZOOM_HEADROOM ≥ FOCUS_MAX_ZOOM or the headroom vanishes at
 * the cap (focusLimits floors `max` at `fit` regardless, so it degrades rather than inverts).
 */
export const FOCUS_MAX_ZOOM = 6;
export const FOCUS_FIT_MAX_ZOOM = 4;
export const FOCUS_ZOOM_HEADROOM = 1.6;
export const ZOOM_PER_WHEEL_PX = 0.0015; // exponential, so zoom feels linear at every scale
export const DRAG_SLOP_PX = 3; // movement beyond this makes a press a drag, not a click
/**
 * How hard you have to push a wheel-out that is already at the tier's floor before it means "leave"
 * (see `onZoomOutFloor`). Not one notch: a flick meant to land back at the fitted view routinely
 * carries a little momentum past it, and spending that momentum on navigation made zooming back out
 * to the default feel like it always exited the deck. So the over-scroll **accumulates** while the
 * camera is pinned at the floor and only leaves once it clears ESCAPE_PUSH_PX, in the same currency
 * the wheel already speaks (|deltaY|, so a trackpad's many small events and a mouse's ~100px notches
 * both count honestly). The sum decays after ESCAPE_PUSH_DECAY_MS without another wheel-out, and any
 * wheel-*in* clears it outright — so resting at the fit is a resting place, and leaving is a
 * deliberate second shove rather than the tail of the first.
 */
export const ESCAPE_PUSH_PX = 320;
export const ESCAPE_PUSH_DECAY_MS = 500;
// Screen-space pick radius. Being screen-space, the world distance it covers grows as you zoom
// out, so far enough out the targets do overlap — pickStar returns the nearest, which is why that
// stays harmless rather than ambiguous.
// 20 rather than the old 7: picking only ever runs inside the focused deck (SkyCanvas guards on
// it), whose stars are drawn larger (FOCUSED_STAR_SCALE) — the target grows with the glyph. Sized
// against the *resting* scale, not the peak: at the zoom ceiling a mastered star is drawn nearly this
// wide itself, which is fine because that is also where its neighbours are furthest apart on screen.
// Comfortably inside MIN_DISTANCE in world units at a focused deck's fit (20/4 = 5 units against a
// 20-unit floor), so neighbours stay separately clickable.
export const HIT_PX = 20;
export const HOVER_HALO_PX = 8; // ring drawn around the hovered star
/**
 * How long the camera takes to fly between tiers (entering a deck, returning to the whole sky).
 * One flight length rather than a distance-scaled one: the two flights it is used for both span
 * roughly one tier, and a constant keeps the gesture's rhythm predictable. Interruptible — any
 * pan or zoom takes over mid-flight — so the ceiling on how long it can feel is the reader's own.
 */
export const CAMERA_TWEEN_MS = 400;
/**
 * How long a star takes to pop in when it is first shown. One constant because two things need to
 * agree on it: the CSS keyframe that plays it, and the timer that marks the star seen afterwards.
 * Marking any earlier drops the class mid-flight and cancels the animation it was meant to allow.
 */
export const STAR_POP_MS = 400;

/* ---------- grouping ---------- */
// There is no time constant here any more: cards group by the *bucket string* the host passes to
// addStar — Aogimi's rule is one constellation per UTC day, derived from the card's created_at.
// The bucket seals on change; `sealStale(today)` closes the last one once its day has passed.

/* ---------- seeding ---------- */
export const DEFAULT_SEED = 'andromeda'; // a constant, so SSR and client render the same first sky

/* ---------- generation ---------- */
/**
 * Two scales are at work below, and the distance between them is what makes a constellation
 * read as one object instead of a patch of an even star field:
 *
 *   inside a group    MIN_DISTANCE .. LINK_REACH    how far apart its own stars sit
 *   between groups    GROUP_CLEARANCE and wider     the moat each group keeps around itself
 *
 * Only the ratio is visible *where the fit is set by the box* — scaling both together makes the sky
 * bigger and the camera's fit zoom hides it completely; widening the second scale alone is what buys
 * a constellation breathing room, and leaves the constellation itself looking the same.
 *
 * **The exception is a deck whose fit is capped rather than derived**, and it is why every number
 * below was scaled by 1.4 together. `focusLimits` caps a focused deck's resting zoom at
 * FOCUS_FIT_MAX_ZOOM and its ceiling at FOCUS_MAX_ZOOM, so a deck small enough to hit those caps is
 * drawn at a *constant* zoom: its links measure `worldLength × 4` at rest and `× 6` fully in,
 * whatever the world scale is. Out there a uniform scale is not hidden at all — it is the only thing
 * that lengthens a link on screen, which is what the larger stars needed. A deck big enough for its
 * own box to set the fit is unaffected, exactly as the paragraph above says.
 *
 * Territory follows from the seeding, not from the clearances: zone n is an annulus
 * RADIUS_SPAN thick holding SEEDS_PER_ZONE * n seeds, which works out to a patch of
 * RADIUS_SPAN * sqrt(2 / SEEDS_PER_ZONE) radius per constellation. Keep that comfortably
 * above the radius a group actually grows to, or groups overflow into each other and end up
 * pressed together at the GROUP_CLEARANCE floor. The 1.4 above holds it: every one of these moved
 * together, so a group's reach and its territory grew by the same factor.
 */
export const RADIUS_SPAN = 196; // zone thickness, used when seeding a new constellation
export const SEEDS_PER_ZONE = 2; // zone n seeds SEEDS_PER_ZONE * n constellations
export const MIN_DISTANCE = 20; // star-to-star floor inside a group, also the tap-target floor
export const GROUP_CLEARANCE = 84; // moat between groups; 1.2x LINK_REACH, so it never reads as a link
export const SEED_CLEARANCE = 196; // a new seed wants this much empty space around it
export const LINK_REACH = 70; // how far a new star may sit from the member it grows off
export const EDGE_CLEARANCE = 28; // nothing may graze a link this closely

/**
 * How close to its parent a sprouting star may land. MIN_DISTANCE is the floor between any
 * two stars, but a *linked* pair needs more room than that: a third star has to sit clear of
 * the pair's link by EDGE_CLEARANCE, and its own link has to clear the pair's far star by the
 * same. Both are only satisfiable if the pair is further apart than EDGE_CLEARANCE — so when
 * EDGE_CLEARANCE is the larger of the two, a pair born closer than that can never take a
 * third member and the constellation dies at two stars. The margin past EDGE_CLEARANCE keeps
 * the workable band of angles wide enough for MAX_RETRIES to actually find one.
 */
export const GROWTH_MIN = Math.max(MIN_DISTANCE, EDGE_CLEARANCE + 5);

export const MAX_RETRIES = 300; // random picks before a zone is called saturated
export const SAFETY_ZONE_LIMIT = 2000; // guard against a runaway search; never reached in practice
// Cell size for the placement grids. GROUP_CLEARANCE is the radius of the spacing test, which
// runs far more than any other query, so matching it is what keeps that test cheap. Measured
// against LINK_REACH-sized cells, which lose more to extra bucket lookups than they save.
export const GRID_CELL = GROUP_CLEARANCE;

/* ---------- clustering ---------- */
/**
 * Far enough out, a session's stars land closer together than the eye can separate them, and
 * drawing all of them spends thousands of shapes to paint a smudge. Past that point the sky is
 * drawn as one soft form per session, which subdivides into lobes as it earns pixels and then
 * burns off into the real constellation.
 *
 * The handover is set in *screen px between neighbouring stars*, not as a multiple of the fit
 * zoom. Fit depends on both the viewport and how far the sky has grown, so a multiple of it means
 * something different for every sky: it would bury a twenty-card sky under clouds while its stars
 * sit 38px apart, and hand over far too early on a five thousand card one. A px gap is the same
 * promise at every size — clouds appear exactly when stars stop being separable, and a sky small
 * enough to read never clouds at all.
 */
export const STAR_GAP = 41; // typical star-to-star distance, world units; bounded by GROWTH_MIN..LINK_REACH
export const HANDOVER_GAP_PX = 18; // stars take over once neighbours sit this far apart on screen
export const CLOUD_ZOOM = HANDOVER_GAP_PX / STAR_GAP; // the zoom the handover is centred on
/**
 * Width of the crossfade, as a zoom *factor* rather than a difference. The wheel is exponential
 * (see ZOOM_PER_WHEEL_PX), so only a factor covers the same slice of the handover per notch at
 * every scale. Roughly one unhurried flick of the wheel.
 */
export const HANDOVER_BAND = 1.6;

// A node stands in for its whole subtree until its footprint reaches this many screen px, then
// defers to its children. Lower means more, smaller lobes: a truer silhouette for more shapes.
// Sized against a session's own extent, which runs 36..283 world units, so the useful band here
// is far below the 150px a 2000-unit-wide world would want.
export const LOBE_SPAN_PX = 32;
export const CLUSTER_LEAF_MAX = 4; // stars in a node past which it subdivides
export const CLUSTER_MAX_DEPTH = 8; // deeper nodes are already under the pixel floor at MAX_ZOOM
export const CLUSTER_SD_FLOOR = MIN_DISTANCE / 2; // a lone star still gets a cloud its own spacing wide

/**
 * How wide a form is drawn, as a multiple of the spread (`sd`) of the stars under it. A roughly
 * even disc of stars of radius R has an sd of about R/sqrt(2), so 1.41 is the multiple that just
 * covers the stars and anything past that is glow around them.
 *
 * The ceiling is the moat: sessions sit GROUP_CLEARANCE apart while being several sd across, so
 * their centroids end up only ~190 world units apart in the crowded inner zones. Push HALO_SPREAD
 * much past 1.8 and neighbouring halos merge into one fog, which costs exactly the thing the far
 * view is for — one legible form per session. 1.6 leaves a fifth of a session's own reach as glow
 * beyond its stars, which is enough to bind them and little enough to keep the moat visible.
 */
export const HALO_SPREAD = 1.6;
/**
 * Peak alpha of that glow, at the very centre of a session. The rest of the falloff scales from it,
 * so this one number is the whole knob: the halo is atmosphere, and it only has to be strong enough
 * to tie a session's lobes into one object. Past ~0.2 it starts competing with the lobes it holds
 * and the sky reads as fog rather than as forms.
 */
export const HALO_ALPHA = 0.14;
export const LOBE_SPREAD = 1.85;
/**
 * The offset twin. A lobe is drawn as **two** overlapping ellipses at slightly different sizes, not
 * one — and this is not decoration. A single ellipse reads as a bubble: it has one centre, one
 * obvious axis, and the eye finds its edge immediately. Two offset ones have no single centre and
 * read as vapour. The squash on each does the same job on a smaller scale.
 */
export const LOBE_TWIN_DX = 0.3;
export const LOBE_TWIN_DY = -0.22;
export const LOBE_TWIN_RX = 0.68;
export const LOBE_TWIN_RY = 0.56;
export const LOBE_TWIN_ALPHA = 0.6;
export const LOBE_MIN_PX = 5; // a lobe never shrinks below this on screen, however few stars it holds
/**
 * The squash is now a *ceiling*: a lobe's actual ry/rx comes from the shape of the stars under it
 * (the covariance of their positions, resolved at build time), clamped between these two. The
 * ceiling keeps an evenly-spread node from rendering as a perfect circle — a field of circles
 * reads as bubbles — and the floor keeps a nearly-collinear session from collapsing into a needle.
 */
export const CLOUD_SQUASH = 0.86; // roundest a lobe may be (ry as a fraction of rx)
export const LOBE_ASPECT_MIN = 0.45; // thinnest a lobe may be

/**
 * The gold hot core (guide §6.4): a knot of mastered cards glints *at its own position* inside the
 * cloud, not at the lobe's centre — the payoff detail that makes a cloud point at its contents
 * before it resolves into stars. Drawn only when the mastered share clears the threshold, so a
 * lone gold card in a big young node does not read as a warm centre it has not earned.
 */
export const HOT_CORE_MIN = 0.25;

/**
 * The slow churn of a cloud: the offset twin orbits the main lobe once per period, phase-staggered
 * per lobe so neighbours never turn in step. Transform-only on purpose — animating a transform is
 * cheap paint, while animating gradient stops would re-upload every gradient every frame, which is
 * the one way to make the cloud layer expensive.
 */
export const CLOUD_DRIFT = true;
export const CLOUD_DRIFT_MS = 60_000;
export const CLOUD_DRIFT_PHASES = 12;
/**
 * Which lobes glint, by `grain` rather than `weight` — see the comment on Lobe.grain. Gating on
 * mass instead would put a glint on every whole session at the far view and none at all once the
 * forms subdivide, which is backwards: a peak is a tight knot, and a knot is a knot at any depth.
 */
export const MESH_PEAK_GRAIN = 0.82;

/**
 * The mesh: what stops a form reading as a blob. Soft fill alone has no edges and nothing for the
 * eye to land on, so every lobe also gets a hard point at its centroid and the points of a session
 * are joined into a spanning tree. Points and strokes are all in screen px, so the structure stays
 * equally crisp however far out you are — it is the fill that scales, not the skeleton.
 *
 * Peaks fall out of the same numbers rather than being a separate idea: a point's radius runs with
 * its lobe's weight, so the busiest knots simply are the biggest points.
 */
export const MESH_POINT_MIN_PX = 0.8; // the loosest lobe still gets a definite point
export const MESH_POINT_MAX_PX = 3.4; // the tightest knot reads as a peak
export const MESH_EDGE_OPACITY = 0.34; // the joins are structure, not mass — the fill carries that
export const MESH_EDGE_PX = 1; // stroke width, screen px
/**
 * The cull box is the view grown by this factor, and it doubles as a **hysteresis band**: a frame
 * is only recomputed when the camera actually escapes the box the last frame was culled against.
 * Every pan frame inside the band reuses the previous frame object untouched, so React sees
 * identical props, skips the whole scene subtree, and the only thing that changes in the DOM is
 * the viewBox attribute. The size is a trade: bigger means more off-screen shapes drawn per frame,
 * smaller means recomputing (and reconciling) more often mid-drag.
 */
export const CULL_SLACK = 1.35;

/* ---------- star labels ---------- */
/**
 * When each star shows its card's front text beside it — **an absolute camera zoom**, deliberately.
 *
 * This used to be `LABEL_GAP_PX / STAR_GAP`: a screen-px gap between neighbouring stars, converted
 * through the *nominal* star spacing. That reasoning is sound for the cloud handover, which is asking
 * whether stars are separable at all, but it made the label gate depend on a constant that only
 * approximates real spacing, and it landed at zoom 1.1 — far below the zooms a focused deck actually
 * resolves to, so labels were up almost the whole time. Read off the stage instead — with a live
 * readout of `camera.zoom` in the corner, the wanted answer is plainly 3.
 *
 * At or below LABEL_HIDE_ZOOM nothing is labelled; the fade completes a LABEL_BAND factor above it.
 */
export const LABEL_HIDE_ZOOM = 3;
/** Width of the fade-in, as a zoom factor above the hide threshold — one unhurried wheel notch,
 *  like the handover's. */
export const LABEL_BAND = 1.4;
/** The zoom the fade completes at, so labels are fully up at 4.2 and gone at 3. */
export const LABEL_ZOOM = LABEL_HIDE_ZOOM * LABEL_BAND;
/** A backstop for hosts whose fronts are sentences: the label is a glance, the panel is the card. */
export const LABEL_MAX_CHARS = 18;
// Sized against the focused view's larger stars (FOCUSED_STAR_SCALE and its peak) — labels only ever
// draw inside a focused deck, so the outer view never sees either. 20 rather than the earlier 16
// because the label now only appears above LABEL_HIDE_ZOOM, where the star beside it is at its
// largest: a label has to hold its own against a 13px glyph, not against a 6px one.
// The weight must be a real cut: Switzer ships 400/500/700 and Noto Sans JP 500/700, neither has a
// 600, so 500 is the heaviest step that stays honest in both faces.
export const LABEL_FONT_PX = 20; // sized for kanji, which is unreadable much below 12
export const LABEL_FONT_WEIGHT = 600;
/**
 * Right and slightly below the star, **past its own radius** — `SkyStars` adds `r` before this, so
 * the gap is the clear space between the glyph's edge and the first glyph of the word rather than a
 * distance from the star's centre. That is why it can be small and still read as separated, and why
 * it did not have to grow when the stars did. 18 rather than 10 is the ask for more air; the vertical
 * offset stays a nudge, since it only centres the text on the star's own line.
 */
export const LABEL_OFFSET_X_PX = 18;
export const LABEL_OFFSET_Y_PX = 5;

/* ---------- selection ---------- */
/** Ring drawn around the selected star, beyond its radius. Wider than HOVER_HALO_PX on purpose:
 *  hover is a question and selection is an answer, and the two must read differently at a glance. */
export const SELECT_HALO_PX = 8;
/** The selected star's glow swells to this multiple of its radius — the reference's amplified glow. */
export const SELECT_GLOW_SCALE = 5.6;

/* ---------- the constellation links ---------- */
/**
 * A link is a **gradient strand**: one continuous hairline whose colour is its two stars' rank
 * colours, running end to end. It reads as the drawing the stars are joined into rather than as
 * chrome laid over them, and it carries the mastery ladder a third time (after colour and
 * silhouette) at exactly the moment two cards are being compared.
 *
 * Inside a focused deck each mixed-rank pair gets its own `<linearGradient>`; everywhere else, and
 * for any pair whose stars share a rank, the strand is the flat blend of the two colours. That
 * split is the cost control — see the strand block in SkyCanvas for why it is drawn where it is.
 *
 * The alphas are the *base*: the layer crossfade (`lod.ts`'s `lineOp`) multiplies them at the group,
 * so these are what a strand reaches at full weight, not what it always wears.
 */
export const LINK_STRAND_PX = 1.5; // screen px inside a focused deck — the first knob to raise
export const LINK_STRAND_ALPHA = 0.62;
/** The outer view and the context decks, where a strand is a faint coloured web under the clouds
 *  rather than the subject. Unfocused decks take UNFOCUSED_DECK_OPACITY on top of this. */
export const LINK_STRAND_MAP_PX = 1;
export const LINK_STRAND_MAP_ALPHA = 0.24;
/**
 * How far each endpoint holds its own colour before the blend starts, as a fraction of the strand.
 * 0 is a pure two-stop ramp; at .15 the middle third is the mix and each end still reads as its own
 * star's rank, which is the whole point of colouring the line from its endpoints.
 */
export const LINK_STRAND_HOLD = 0.15;
/**
 * How far a rank colour is lifted toward white to become a strand colour, 0..1.
 *
 * Not decoration — the strand is unreadable without it. The links used to be drawn in one near-white
 * per preset precisely because a mid-tone line "sat below the stars it joins and read as a shadow
 * between them instead of as the drawing" (see palette.ts). Half the rank colours are *darker* than
 * the mid-tone that was rejected — ginga's New is #48545C on a near-black sky — so taking colour
 * from the endpoints without lifting it would reintroduce the exact bug the near-white fixed. The
 * lift buys back the luminance and keeps the hue, which is the part that carries meaning.
 */
export const LINK_STRAND_LIFT = 0.42;

/**
 * The links are drawn twice inside the focused deck: a wide, very faint pass under the crisp 1px
 * one, so a link carries a soft continuous glow from end to end.
 *
 * **A second stroke rather than a blur filter**, and that is a hard constraint rather than a
 * preference: `feGaussianBlur` (or a CSS `drop-shadow`) on the link layer re-renders its filter
 * region on every viewBox change — every frame of every pan and zoom — which throws away the paint
 * cache that `useSkyDraw`'s frame reuse exists to protect. Two plain strokes cost one extra element
 * per link and nothing per frame.
 *
 * Focused deck only. At the chooser the links are context, there are a dozen decks of them, and the
 * bloom would be spent where nothing is being read.
 */
export const LINK_GLOW_PX = 4; // screen px, like every other stroke width here
export const LINK_GLOW_ALPHA = 0.028;

/* ---------- the deck wash: the focused interior's always-on atmosphere ---------- */
/**
 * Three broad, overlapping tints under a focused deck's whole drawing — the handoff's "nebula veils",
 * rebuilt on the deck's **spread (`sd`) rather than its bounding box**.
 *
 * That distinction is the whole reason this exists at all: the bbox-sized version was assessed and
 * rejected (DECISIONS.md, "Nebula veils and the dust layer") because every other size in this engine
 * comes off the tight box or `sd`, and a bbox-sized decorative drifts away from the drawing it is
 * supposed to sit under. Sized off the deck tree's root — centroid, `sd`, principal axis and blended
 * tint, all already computed in `indexSky` — it is the same look with none of that objection, and it
 * costs three ellipses and two gradients for the whole scene.
 *
 * **It is deliberately not part of the cloud layer.** The clouds are a stand-in for stars the budget
 * could not afford, so they fade to nothing exactly as the reader zooms in — which left the interior
 * at its most magnified with stars and lines on a flat page and nothing behind them. The wash answers
 * to no zoom threshold and no veil: it is simply always there, which is the only property the
 * reference layer had that ours did not.
 *
 * Three rather than one because a single radial fill reads as a bubble — it has one centre and one
 * findable edge. Overlapping tints at different sizes have neither, which is what reads as vapour.
 * The last takes the deck's *peak* rank colour (the reference's always-gold third), so a deck that
 * has mastered something is warm underneath.
 */
export const WASH_ALPHA = 0.22;
/** Offsets and radii as multiples of the root's `sd` (the y axis additionally scaled by its aspect),
 *  with the per-ellipse opacity the reference gives each. `peak` takes the peak colour, not the body. */
export const WASH_LOBES = [
  { dx: -0.5, dy: -0.34, rx: 1.75, alpha: 1, peak: false },
  { dx: 0.74, dy: 0.68, rx: 1.4, alpha: 0.9, peak: false },
  { dx: 0.14, dy: 1.13, rx: 0.95, alpha: 0.55, peak: true },
] as const;
/**
 * The smallest spread a wash may be sized from, in world units.
 *
 * Without it the layer would be missing on exactly the decks that need it most: a one-card deck's
 * root `sd` is the CLUSTER_SD_FLOOR (half of MIN_DISTANCE), which would put its whole atmosphere
 * inside about a hundred screen px around a single star — a smudge on the star rather than a sky
 * under it. One LINK_REACH is "at least a link's worth of sky", which also means it follows the
 * generation scale if that is ever retuned again rather than being a second number to remember.
 */
export const WASH_MIN_SPREAD = LINK_REACH;

/* ---------- decks ---------- */
/**
 * The gap between two deck cells on the grid, in **world units** (the handover's `gap`). World
 * rather than screen px on purpose: it survives every zoom, so decks hold their separation at the
 * outermost view exactly as they do inside one. A screen-px gap would close as you pulled back
 * and the decks would fuse into a smear.
 *
 * Narrow next to the old ring's 240 moat, deliberately: the frames now do the separating — each
 * deck wears a drawn card, so the space between decks only has to read as a gutter between cards,
 * not as the void that keeps two anonymous forms from fusing.
 */
export const DECK_GRID_GAP = 76;
/**
 * How far past a cell's edge a press still counts as that deck (`deckAt`).
 *
 * Sized so the gutters resolve and nothing else does. A point in the middle of a four-way gutter
 * junction sits `DECK_GRID_GAP/2` away on *both* axes, so the reach has to clear
 * `GAP/2 × √2 ≈ 53.7` or those junctions go dead; past that it starts claiming the empty sky the
 * fitted camera leaves around the grid, which is what made a press anywhere enter an extremity deck.
 */
export const DECK_HIT_SKIRT = DECK_GRID_GAP * 0.75;
/** Margin between a deck's outermost star and the edge of its focused box. */
export const DECK_PAD = 40;
/**
 * The deck card frame's bands, in world units (the handover's `FR = { pad, head, foot }`): the
 * margin between the outermost star and the frame's edge, the header band above (cover tile,
 * name, subtitle), and the footer band below (counts, due pill). Layout geometry *and* renderer
 * geometry — `layoutDecks` sizes the grid cells from these and `SkyFrames` draws the bands from
 * the same numbers, which is what keeps the card and its cell in agreement.
 */
export const FRAME_PAD = 86;
export const FRAME_HEAD = 134;
export const FRAME_FOOT = 104;
/** A frame is never narrower than its deck's name needs (the handover's `minFrameW`):
 *  FRAME_MIN_W plus FRAME_MIN_W_PER_CHAR per character of the name. */
export const FRAME_MIN_W = 250;
export const FRAME_MIN_W_PER_CHAR = 30;

/* ---------- the frame's own type, and the LOD that retires the frame ---------- */
/**
 * The frame's text, in **screen px** — the sizes it actually renders at, at every zoom.
 *
 * These used to be world units stated literally in `SkyFrames` (name 42, glyph 30, counts 22,
 * subtitle 19), which meant a frame's type shrank with the sky. That reads fine at four decks and
 * fails completely at twenty: at the fits this app resolves to, the deck *name* lands at 6.8px on a
 * 1440 laptop and 9.1px at 1920, and the subtitle at 3–4px. The card was never short of pixels —
 * only its type was, and it was the one thing in the renderer not measured in screen px (every
 * star radius, stroke and label already is; see `starRadiusPx`).
 *
 * Screen-px type has a cost the world-space kind did not: it no longer shrinks to fit its card, so
 * past some point the header stops fitting inside the frame. That point is what FRAME_LOD_* below
 * is for — the two changes are halves of one fix and neither works alone.
 */
export const FRAME_NAME_PX = 15;
export const FRAME_GLYPH_PX = 11;
export const FRAME_SUB_PX = 7.5;
export const FRAME_COUNT_PX = 8;
/** The framed card's due pill. The due figure is the one number on a card that drives a decision,
 *  so it is deliberately the largest thing in the footer rather than sharing the counts' size. */
export const FRAME_DUE_PX = 10.5;
/** ...and the frameless inline count, which sits beside the name and has to hold its own against it. */
export const FRAME_DUE_INLINE_PX = 11.5;
/** The header/footer insets and the cover tile, also screen px, so the whole block scales as one. */
export const FRAME_INSET_PX = 11;
export const FRAME_COVER_W_PX = 19;
export const FRAME_COVER_H_PX = 25;
/** Sized around FRAME_DUE_PX — raise that and these have to follow or the text outgrows the pill. */
export const FRAME_PILL_W_PX = 62;
export const FRAME_PILL_H_PX = 22;

/**
 * The hover fog behind a frameless deck: how far past its content box the fog reaches, and its
 * strength at the centre.
 *
 * Frameless decks had only their name brightening to show hover, which is far too quiet a signal for
 * a target the size of a constellation — there is no card edge left to light up. The fog restores a
 * *shape* to the hover, and being a radial fade it needs no border to stop against.
 */
export const DECK_FOG_PAD = 30;
export const DECK_FOG_ALPHA = 0.15;

/**
 * The frameless deck's label chip — a glass pill holding the name and the due count, all screen px
 * like the rest of the frame's type.
 *
 * `CHIP_H_PX × u` has to stay inside the room below the stars (`FRAME_PAD + FRAME_FOOT`, 190 world
 * units), which holds down to about zoom 0.116; below that the pill grazes the lowest stars by a few
 * world units, which is beneath noticing but is the reason not to make it much taller.
 */
export const CHIP_H_PX = 22;
export const CHIP_PAD_X_PX = 9;
/** Between the name and the due figure. Generous on purpose: it is also the slack that absorbs the
 *  name-width estimate's error (see `textPx`), so it should not be trimmed to what looks tight. */
export const CHIP_GAP_PX = 10;
/** Keeps the pill off its cell's side edges, so two neighbours never touch. */
export const CHIP_MARGIN_PX = 6;
/** Letter-spacing on the due text, which is what makes it read as a label rather than a number. */
export const CHIP_DUE_TRACK_PX = 1.1;

/**
 * Frame LOD: the card width in **screen px** below which a deck gives up its card and is drawn as
 * its bare constellation with its name beneath it — no frame, no cover tile, no counts.
 *
 * The information is not lost, it is *deferred*: every figure a frame carries is on show the moment
 * the deck is entered. What is not deferrable is the due count, which is the only thing on a card
 * that answers the question the chooser tier exists to ask, so frameless decks keep it inline with
 * the name.
 *
 * 200 puts a twenty-deck sky frameless on a 1440 laptop (its cards measure ~187px) and framed from
 * about 1600 up (~215px) — which is the intent: small screens trade the chrome for a legible
 * constellation and name, large ones keep the card.
 *
 * **One threshold, no hysteresis, and that is a consequence of `frameBoxOf` ignoring the mode.**
 * The card width this is compared against is the same number in both modes, so the decision cannot
 * feed back into its own input. Let the frameless cell shrink — the obvious next optimisation — and
 * that stops being true: cells shrink, the fit rises, cards clear the threshold, the frame returns,
 * cells grow, the fit falls, forever. It would then need a deadband and a memory of its own last
 * answer. The measured reason not to bother is at `frameBoxOf`.
 */
export const FRAME_LOD_PX = 200;
/**
 * How much field a **lone** deck's card is given, as a multiple of the cell in each axis.
 *
 * A card's drawn size is decided by the camera fitting the field it is in, so with more than one
 * deck the grid itself bounds every card — a neighbour is what says "a card is about this big".
 * A single deck has none, and the field is then exactly its own cell: the camera fits that to the
 * stage, so the card is drawn edge to edge and keeps growing in both axes with every card mined
 * into it. Flooring the field at this multiple of the cell caps that: the card keeps its own
 * proportions and simply sits in more sky. 2 draws it at about half the uncovered band — the same
 * range a card lands in on a four- or five-deck sky, so a lone deck reads as one card among the
 * sizes you already see rather than as a poster. Lower it to make the lone card bigger.
 *
 * Only the one-deck case. From two decks up the grid is the limit, and applying a floor there would
 * shrink arrangements nobody asked it to.
 */
export const SOLO_FIELD_CELLS = 2;
/**
 * The aspect (width over height) the grid's shape is chosen against — a stand-in for the
 * landscape stage the unified page fits the sky into. The layout cannot read the real viewport
 * (it runs before the camera exists, and a layout that answered to the window's width would
 * re-arrange the chooser on every resize), so the candidate grid shapes are scored against this
 * nominal window instead and the camera's fit absorbs the per-device remainder, exactly as
 * FIELD_ASPECT's does. 2.3 is the common laptop band (1280–2560px wide) with the handover's
 * sky-level overlay insets (T105/B245/L54/R54) taken off: 2.2–2.6 across that band.
 */
export const GRID_ASPECT = 2.3;

/* ---------- the outer view's star budget ---------- */
/**
 * How many individual stars one deck may spend **at the outer view**. A deck under its budget is
 * drawn whole; a deck over it collapses groups until it fits, each collapsed group leaving one
 * surviving "fulcral" star behind. The budget is the only reason a 1000-card deck and a 10-card one
 * read as comparable objects out there — without it the first is a smear and the second is a speck.
 *
 * The budget governs only the outer view. Inside a focused deck the unit is a session and zoom is
 * honest again, so the interior runs the zoom-band crossfade (CLOUD_ZOOM / HANDOVER_BAND above)
 * over per-session trees instead — the same view the single-deck sky always had.
 */
export const SKY_STAR_BUDGET = 8;
/**
 * How much a deck's *forms* swell with its card count at the outer view, as a multiplier on the
 * halo and lobe radii: the busiest deck draws at MAX, and the rest scale down by √(count/busiest) —
 * square root, because the eye reads area as amount and area goes with the radius squared. This is
 * what makes a 900-card deck visibly outweigh a 40-card one at a glance, over and above its larger
 * footprint: the mass difference is legible without entering either. Outer view only — inside a
 * deck the forms already sit where its own stars are, and inflating them would just be fog.
 */
export const DECK_MASS_MIN = 0.75;
export const DECK_MASS_MAX = 1.5;
/**
 * The condensed *interior* also draws real stars — the same budget mechanism, sized for a deck that
 * now fills the whole viewport instead of one grid cell. Without this the far view inside a deck is
 * nothing but lobes and mesh points until the crossfade brings the star layer up around the halfway
 * mark; with it, a spread of survivors (the peak quota, the fulcral stand-ins, the gap fill) is
 * there from the first frame and simply hands over to the full drawing as you go in.
 */
export const DECK_PREVIEW_BUDGET = 24;
/** Screen px a star needs to itself before its group is a candidate for collapsing. */
export const STAR_SPACING_PX = 22;
/**
 * A node holding fewer points than this never agglomerates, however tight it is on screen. This is
 * precisely why a small deck stays legible as a drawing at every zoom while a dense one dissolves:
 * its leaves hold one or two stars and can never collapse. Lowering it to 2 makes small decks lose
 * their identity — see §11 of the agglomeration guide.
 */
export const COLLAPSE_MIN_POINTS = 3;
/** The collapse span is grown by this factor, up to this many times, until the deck fits budget. */
export const LOD_SPAN_GROWTH = 1.14;
export const LOD_SPAN_STEPS = 28;
/**
 * Share of the budget reserved for the most-reviewed stars, which always survive. Sampled evenly by
 * index rather than taken from the front, so they spread across the deck instead of clumping into
 * whichever corner happens to hold the drilled cards.
 */
export const PEAK_QUOTA = 0.35;
/**
 * Exclusion radius for the gap fill, as a multiple of STAR_SPACING_PX. After collapsing, low-level
 * stars are admitted into the empty stretches until the deck reads as a continuous field again.
 *
 * Skipping the gap fill is the single most common way to make agglomeration look broken: survivors
 * cluster where the density is, the empty stretches go bare, and a deck reads as a ring of blobs
 * rather than as a place.
 */
export const GAP_FILL_SPACING = 2;
/** How many gap-fill stars may be admitted, as a share of the budget. */
export const GAP_FILL_QUOTA = 0.8;
/** A fulcral star stands in for a whole collapsed group, so it carries more ink than a lone one. */
export const FULCRAL_SCALE = 1.55;
/**
 * Stars of the focused deck itself, over the neutral base the outer view draws at. The interior is
 * where a star is a click target and a label anchor rather than one point of a silhouette, so it
 * carries more ink there — and HIT_PX / LABEL_FONT_PX are sized against this.
 *
 * **A pair, not a constant**: the deck's stars carry `FOCUSED_STAR_SCALE` at its resting fit and
 * `FOCUSED_STAR_PEAK_SCALE` at its zoom ceiling, interpolated in log space between the two
 * (`focusedScale` in star.ts). The peak is twice the base, so fully zoomed in a star is exactly
 * double the size the old flat 1.35 drew it at, and at every zoom short of that it tapers back to
 * the sizing the deck always had — the extra ink is a reward for going in, not the resting state.
 *
 * The ramp is anchored to the deck's **own** ceiling rather than to a nominal zoom, because there is
 * no such thing as one max zoom here: `focusLimits` gives a sparse deck a relZoom ceiling of ~1.5 and
 * a dense one ~16. A shared reference would double a big deck's stars and leave a small deck's
 * untouched; anchoring per deck means "fully zoomed in" means the same thing in each.
 *
 * The outer view is untouched by design — it has its own answer for small decks (see
 * SMALL_DECK_MAX below).
 */
export const FOCUSED_STAR_SCALE = 1.35;
export const FOCUSED_STAR_PEAK_SCALE = 2.7;
/** Stars of a deck that is not the focused one, relative to the neutral base — the outer view's
 *  scale, which the focused boost above deliberately leaves untouched. */
export const UNFOCUSED_STAR_SCALE = 0.86;

/* ---------- the outer view's smallest decks ---------- */
/**
 * At the chooser, a deck with this many cards or fewer is drawn **bigger and brighter**, ramping
 * inversely with its count — `deckPresence` in star.ts resolves the pair.
 *
 * The budget in `cluster.ts` equalises decks from above: it stops a thousand-card deck being a smear.
 * Nothing equalised them from below, and two separate rules were quietly shrinking the smallest ones:
 * a deck under budget collapses nothing, so it has no fulcral survivor and no cloud — which makes
 * every one of its stars `dim` (0.55 core, no specular, no bead, rings at RING_DIM) and leaves it at
 * UNFOCUSED_STAR_SCALE's 0.86. A one-card deck therefore drew as a single faint 2px dot on a grid
 * where a busy neighbour draws a whole lit form, and at twelve decks it was effectively invisible.
 *
 * So presence is restored on both axes the dimming took it from — **size** (the scale below) and
 * **detail** (`vivid`, which spends the ink a fulcral star already gets: full-strength core,
 * specular, and the glass bead once the radius crosses BEAD_MIN_CORE_PX). That is why the boost is
 * this large: a lone star has to hold a grid cell against neighbours drawn as constellations.
 *
 * The ramp reaches exactly 1 at `SMALL_DECK_MAX + 1`, so there is no step at the boundary — a
 * six-card deck and a five-card deck differ by a third of the boost, not by the whole of it.
 */
export const SMALL_DECK_MAX = 5;
/** The one-card deck's multiplier; every count up to SMALL_DECK_MAX interpolates down toward 1. */
export const SMALL_DECK_STAR_BOOST = 2.6;
/** ...and how far the rest of an unfocused deck fades once one deck has focus (handover: .24). */
export const UNFOCUSED_DECK_OPACITY = 0.24;

/* ---------- star form ---------- */
/**
 * How a star's screen radius answers zoom, as an exponent on the zoom *relative to the tier's
 * fitted view*. Sublinear is the whole feel of it: stars swell far slower than the world does, so
 * zooming in reveals *more* stars rather than merely bigger ones, and pulling back never collapses
 * them into invisible specks.
 *
 * Relative rather than absolute zoom, because `Camera.zoom` is px per world unit and means nothing
 * on its own — a deck fitted to the viewport sits at a different absolute zoom from the whole sky
 * fitted to it. Anchoring the swell to 1.0 at each tier's fit is what makes the two tiers feel like
 * the same sky rather than two differently-scaled ones.
 */
export const STAR_ZOOM_EXPONENT = 0.42;
// Mastery is no longer dealt here — it arrives on each card from the host's own SRS ladder
// (`CardContent.mastery`). The demo-era MASTERY_SPLIT deal is gone with it.
/**
 * Radius of the soft glow behind a star, as a multiple of its own. The reference draws it at 4.6
 * with the centre stop at .5 alpha; both were visibly too much here — a field of stars read as a
 * field of halos — so the area and the intensity (see the glow gradient stops in SkyCanvas, and
 * the opacity maths in SkyStars) are pulled down together.
 */
export const STAR_GLOW_SCALE = 3.2;

/* ---------- signal rings: the rank glyph ---------- */
/**
 * **The ornament ceiling, and the one number the rest of this block is negotiated against.**
 *
 * Every *stroked* ornament stays inside this multiple of the star's own radius. Two independent
 * limits meet here and 1.9 is where they both hold:
 *
 * - **The star pitch.** `STAR_SPACING_PX` (22) is the room a star needs before its group collapses,
 *   so survivors sit on roughly a 22px pitch. A mastered star in a focused deck measures
 *   `4.2 × 1.35 ≈ 5.7px`, so an ornament radius of 1.9r ≈ 10.8px puts its full width at ~21.5px —
 *   just inside the pitch. Rings are the one glyph that cannot tolerate overlap: two overlapping
 *   ring systems do not read as two stars, they read as moiré. The handover's own radii (rings to
 *   2.4r, orbit to 2.55r) overrun the pitch by a third and were pulled in to this.
 * - **The repaint rect.** The halo already reaches `STAR_GLOW_SCALE` (3.2r) and bounds each star's
 *   dirty rect, so anything under that ceiling costs nothing extra on a pan. Reach past 3.2r and
 *   every pan frame's dirty rects grow with it.
 */
export const ORNAMENT_MAX = 1.9;
/**
 * The core, as a multiple of the star's own radius — the handover's glass bead at `.78r`, and the
 * same law for every rank now that no rank hides its core behind a solid body.
 *
 * The 0.78 is load-bearing for ring legibility rather than cosmetic: it opens a `0.52r` gap between
 * the rim and the first ring at 1.3r. At a full-radius core that gap is 0.3r and the inner ring
 * merges into the rim, which costs the glyph the thing it exists for.
 */
export const CORE_SCALE = 0.78;
/**
 * How many rings a rank wears: `min(rank, RING_MAX)` — 0 · 1 · 2 · 2 + orbit.
 *
 * Capped at two on purpose. Ring stroke bottoms out at the `RING_WIDTH_MIN` floor at every real
 * radius, so three rings on a ~1.7px pitch is three hairlines that cannot be counted at field size;
 * the mastered rank takes the orbit as its fourth state instead of a third ring. What the ladder
 * buys over the outgoing `dot · dot · cross · sparkle` vocabulary is that **rank 0 and rank 1 are
 * finally different shapes** — that pair was identical before, so the silhouette ladder only ever
 * delivered three of its four states.
 */
export const RING_MAX = 2;
/** First ring's radius and the step out to the next, as multiples of the star's own radius. The
 *  outermost (`RING_BASE + RING_STEP` = 1.75r) sits inside ORNAMENT_MAX. */
export const RING_BASE = 1.3;
export const RING_STEP = 0.45;
/** Ring stroke in screen px: this share of the radius, never thinner than the floor. */
export const RING_WIDTH = 0.07;
export const RING_WIDTH_MIN = 0.75;
/** Per-ring alpha, innermost first (the handover's `.6 − .14n`). Exactly RING_MAX long. */
export const RING_ALPHA = [0.6, 0.46];
/** What a dimmed deck's rings keep, matching the ratio the outgoing cross carried (.34/.72). */
export const RING_DIM = 0.47;

/* ---------- brightness, from retrievability ---------- */
/**
 * What a fully-faded star still keeps of its light (`Star.glow` = 0).
 *
 * Brightness is the sky's **second** signal, under rank: rank owns silhouette,
 * colour and radius and is monotonic above Learned, so a card the reader has
 * let slip cannot be shown by demoting it. It burns lower instead.
 *
 * The floor is high on purpose. Retrievability decays toward zero without
 * bound, and a star that faded to nothing would read as a *deleted card* —
 * precisely the opposite of the message, which is that the word is still there
 * and wants revisiting. At 0.35 a forgotten star is unmistakably the dimmest
 * thing in its constellation while still clearly being a star.
 *
 * This is a separate axis from `dim`/`RING_DIM`, which is about *focus* — which
 * deck you are looking at — not about memory. The two multiply: an unfocused
 * deck's faded star is faint twice over, which is correct both times.
 */
export const STAR_MIN_LIT = 0.35;

/* ---------- the mastered rank's orbit ---------- */
/**
 * MASTERED earns an orbit and a satellite — its fourth state, and a *shape* signal rather than a
 * motion one. The handover twinkled the outermost ring and the orbit; that was dropped, because an
 * infinite animation on two elements per gold star repaints its region every frame with the camera
 * parked, and the star layer is otherwise completely static once it has landed. Nothing here
 * animates.
 *
 * `rx` is the ornament ceiling itself — the orbit is the widest thing a star draws.
 */
export const ORBIT_RX = ORNAMENT_MAX;
/** Squashed to about a third of the width, which is what reads as a ring seen near edge-on. */
export const ORBIT_RY = 0.63;
/** Degrees. The satellite's position is derived from this in `orbitOf`, so the tilt has one home. */
export const ORBIT_TILT = -22;
export const ORBIT_ALPHA = 0.38;
export const ORBIT_WIDTH = 0.9;
/** The satellite's seat on the orbit *before* the tilt, as multiples of the star's radius. */
export const SATELLITE_X = 1.56;
export const SATELLITE_Y = -0.36;
/** Satellite radius: this share of the star's, never smaller than the floor. */
export const SATELLITE_R = 0.15;
export const SATELLITE_R_MIN = 1.4;

/* ---------- the glass bead ---------- */
/**
 * Core radius in screen px below which the bead's six layers are not drawn — the star falls back to
 * the flat core and specular the sky has always drawn.
 *
 * The handover's bead is specified against a sample strip at `r = 13…25` (`c = 10…19.5px`). At the
 * radii this app actually draws, `c` lands at **1.5–4.4px**, where the bead's secondary dot
 * (`.09c`) is a *third of a pixel* and its specular ellipse under 1.5px — six layers of detail
 * resolving to a slightly muddier dot, at three gradient fills per star instead of one.
 *
 * Gating it also bounds the cost by construction: `c ≥ 6` needs `r ≥ 7.7px`, which is `relZoom ≥ 2.2`
 * for MASTERED and `≥ 7.6` for NEW — and at relZoom 2.2 the world has scaled 2.2×, so the viewport
 * holds about a fifth as many stars. Beaded stars can never be numerous. Precedent is the specular's
 * own long-standing 1.2px skip in SkyStars.
 */
export const BEAD_MIN_CORE_PX = 6;
