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
export const MAX_ZOOM = 2; // px per world unit, zoomed all the way in
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
// 11 rather than the old 7: picking only ever runs inside the focused deck (SkyCanvas guards on
// it), whose stars are now drawn larger (FOCUSED_STAR_SCALE) — the target grows with the glyph.
// Still comfortably under MIN_DISTANCE at the fit, so neighbours stay separately clickable.
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
 * Only the ratio is visible. Scaling both together just makes the sky bigger, which the
 * camera's fit zoom hides completely; widening the second scale alone is what buys a
 * constellation breathing room, and leaves the constellation itself looking the same.
 *
 * Territory follows from the seeding, not from the clearances: zone n is an annulus
 * RADIUS_SPAN thick holding SEEDS_PER_ZONE * n seeds, which works out to a patch of
 * RADIUS_SPAN * sqrt(2 / SEEDS_PER_ZONE) radius per constellation. Keep that comfortably
 * above the radius a group actually grows to, or groups overflow into each other and end up
 * pressed together at the GROUP_CLEARANCE floor.
 */
export const RADIUS_SPAN = 140; // zone thickness, used when seeding a new constellation
export const SEEDS_PER_ZONE = 2; // zone n seeds SEEDS_PER_ZONE * n constellations
export const MIN_DISTANCE = 14; // star-to-star floor inside a group, also the tap-target floor
export const GROUP_CLEARANCE = 60; // moat between groups; ~2x LINK_REACH, so it never reads as a link
export const SEED_CLEARANCE = 140; // a new seed wants this much empty space around it
export const LINK_REACH = 50; // how far a new star may sit from the member it grows off
export const EDGE_CLEARANCE = 20; // nothing may graze a link this closely

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
export const STAR_GAP = 29; // typical star-to-star distance, world units; bounded by GROWTH_MIN..LINK_REACH
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
 * When each star shows its card's front text beside it. Same currency as the cloud handover:
 * screen px between neighbouring stars, because that is what decides whether there is *room* for a
 * word — a zoom threshold would mean something different on every sky. The gap is wider than
 * HANDOVER_GAP_PX by design: stars become separable long before their labels do.
 */
export const LABEL_GAP_PX = 32; // a front is a single short word now, so it earns room early
export const LABEL_ZOOM = LABEL_GAP_PX / STAR_GAP; // the zoom the fade completes at
/** Width of the fade-in, as a zoom factor below LABEL_ZOOM — one wheel notch, like the handover. */
export const LABEL_BAND = 1.4;
/** A backstop for hosts whose fronts are sentences: the label is a glance, the panel is the card. */
export const LABEL_MAX_CHARS = 18;
// 14/500 rather than the original 12/400: sized against the focused view's larger stars
// (FOCUSED_STAR_SCALE) — labels only ever draw inside a focused deck, so the outer view never
// sees either. The weight must be a real cut: Switzer ships 400/500/700 and Noto Sans JP 500/700,
// neither has a 600, so 500 is the heaviest step that stays honest in both faces.
export const LABEL_FONT_PX = 16; // sized for kanji, which is unreadable much below 12
export const LABEL_FONT_WEIGHT = 600;
/** Right and slightly below the star, past its own radius. Screen px, like every offset here. */
export const LABEL_OFFSET_X_PX = 10;
export const LABEL_OFFSET_Y_PX = 4;

/* ---------- selection ---------- */
/** Ring drawn around the selected star, beyond its radius. Wider than HOVER_HALO_PX on purpose:
 *  hover is a question and selection is an answer, and the two must read differently at a glance. */
export const SELECT_HALO_PX = 8;
/** The selected star's glow swells to this multiple of its radius — the reference's amplified glow. */
export const SELECT_GLOW_SCALE = 5.6;

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
 */
export const FOCUSED_STAR_SCALE = 1.35;
/** Stars of a deck that is not the focused one, relative to the neutral base — the outer view's
 *  scale, which the focused boost above deliberately leaves untouched. */
export const UNFOCUSED_STAR_SCALE = 0.86;
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
/** A cross-armed star's arms run from this multiple of its radius to that one. */
export const CROSS_INNER = 0.92;
export const CROSS_OUTER = 1.95;
/**
 * The mastered silhouette: a **single** four-point sparkle, points on the axes — a fat diamond
 * with gently concave sides. The old form stacked a second sparkle rotated 45° under it for an
 * eight-armed glint; that was removed as clutter, and the waist here is deliberately wide (about
 * half the arm) so the body stays solid where the old slender arms read as lines.
 */
/**
 * Sized as the star's *body*, not as an ornament around it: the flanks at 45° sit right about
 * where a dot's rim would (≈0.54 × arm), so a mastered star carries the same visual mass as its
 * neighbours and only its points reach past them.
 */
export const SPARKLE_ARM = 1.7; // point radius, as a multiple of the star's own
export const SPARKLE_WAIST = 0.92; // waist half-width; ~0.54 of the arm is the reference's fatness
/** The core dot under a sparkle, sizing its specular highlight. The body hides the dot itself. */
export const SPARKLE_CORE = 0.6;
