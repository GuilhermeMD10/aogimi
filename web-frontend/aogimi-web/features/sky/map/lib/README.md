# lib/sky — the shared half

Everything in this directory is plain TypeScript: no React, no DOM, no browser globals, no
platform assumptions. It is meant to be copied or symlinked into the mobile app unchanged, so
that one seed produces one sky on every platform.

**The rule: if a file in here needs `document`, `window`, an `Element`, or a React import, it is
in the wrong directory.** Web-specific code lives in `components/sky/`.

## What is in here

| file | what it owns |
| --- | --- |
| `rng.ts` | seed + card identity → deterministic number stream |
| `generator.ts` | grows a sky one card at a time; owns all placement rules |
| `grid.ts` | uniform spatial hash that makes placement checks O(1) |
| `geometry.ts` | distance/intersection helpers, and the sky's bounding box |
| `camera.ts` | pan/zoom maths over a `Viewport`; pure functions, no gestures |
| `picking.ts` | which star is under a point, by coordinates rather than by hit-testing nodes |
| `cluster.ts` | a quadtree per session, and which of its nodes to draw at a given zoom |
| `lod.ts` | which of the three layers — clouds, lines, stars — is up at a given zoom |
| `palette.ts` | the four hue presets, what colour a star or a cloud is, and its gradient stops |
| `cards.ts` | placeholder card content for `addStar`'s optional `card`, default deck names, `clip()` |
| `config.ts` | every tweakable, in one place |
| `types.ts` | the shared vocabulary |

## Determinism

`rng.ts` uses only integer ops (`Math.imul`, shifts) and IEEE doubles, so the same seed yields
bit-identical positions on any JS engine — Hermes, JavaScriptCore, V8. Two things protect that,
and both are easy to break by accident:

- **Placement must never read mutable state.** A star's `count` changes as cards are reviewed and
  its `seen` changes as it is drawn; nothing in the generator may consult either. Clicking a star,
  or merely looking at one, must not move it or any later one.
- **Iteration order must stay stable.** Stars, links, and constellation members are all
  append-only and read in id order. `nearestMember` breaks exact ties on the lower id for the same
  reason: so a grid's cell ordering cannot leak into the result.

Timestamps decide grouping, and they are also the default card key — see below. Placement never
reads the clock itself, so a rebuild does not have to replay wall-clock time, only the dates.

## Identity, and loading a sky back

Each card places from its **own** stream, `streamFor(seed, key)`, rather than from one shared stream
advanced once per draw. The difference is not stylistic:

- A shared stream carries a **cursor**, and a snapshot cannot capture it. Save a sky, reload it, mine
  one more card, and it lands somewhere an unbroken run never would have put it. Measured, and it is
  why `hydrate` could not have worked before this.
- Per-card streams have no cursor. `hydrate(snapshot)` rebuilds the grids, member lists, id counters
  and frontier zone from stored stars and links — all of it derived — and cards mined afterwards land
  exactly where they would have without the interruption. 3.7ms at 5000 stars; the next card then
  places in under a millisecond.

**The key must be immutable for the life of the card.** Its id, or the moment it was created, which
is the default. Never its contents or anything editable: a key that changes teleports the star.

What this does *not* buy is stability under deletion. Placement is rejection sampling, so removing a
star frees space and a later candidate that used to be rejected now succeeds. Deleting one card out
of a hundred moves 12 others on average and 75 at worst — far better than the ~45 a shared stream
would move, but not a guarantee. **If positions must never change, store them.** Generation then only
ever runs for a card that does not have one yet, and `hydrate` is how the stored ones come back.

## Level of detail

Drawing every card stops being possible long before it stops being tempting. At 5000 cards the
fully pulled-back view puts neighbouring stars under 3px apart, so the honest picture of the sky is
not 5000 stars and 4648 links — it is 352 soft forms, one per session, each subdividing into lobes
as it earns the pixels to justify them.

Two pieces, and the split between them is what keeps it cheap:

- **`cluster.ts` builds, and depends only on the data.** One quadtree per constellation, each node
  carrying the centroid, spread, tight bbox and review histogram it would be drawn from. Rebuilding
  this when the camera moves is the single mistake that undoes the whole feature. It *does* depend
  on `count`, so a review changes the answer — that is fine, it is 2ms at 5000 cards.
- **`cloudFrame` walks, and depends on the camera.** A node stands in for its entire subtree while
  its footprint is under `LOBE_SPAN_PX` on screen, and defers to its children once it is wider.
  Cost is O(what is visible), not O(the sky): measured under 0.01ms at 5000 cards.

`lod.ts` decides how strongly each layer is faded up. The handover is pinned to **screen px between
neighbouring stars** (`HANDOVER_GAP_PX`), not to a multiple of the fit zoom — fit depends on the
viewport *and* on how far the sky has grown, so a multiple of it means something different for every
sky. A px gap is the same promise at every size: clouds appear exactly when stars stop being
separable, and a sky small enough to read never clouds at all.

Two rules a renderer has to respect, both learned the hard way:

1. **Nothing driven from `layersAt` may carry a CSS transition.** Those values are functions of
   zoom, so they have to land on the same frame as the view rectangle, for the same reason a star's
   radius does. A transition makes the clouds lag the geometry during a gesture.
2. **A shape's entry animation must not fire when culling remounts it.** Culling unmounts what
   leaves the view and remounts it on the way back, and a mount-triggered animation cannot tell
   that from a card being mined. `Star.seen` is what settles it — see below.

## Arrivals

Cards are mined in the background, so the sky is often closed or looking elsewhere when one lands.
`Star.seen` records whether a star has ever actually been drawn for the reader, and a star that has
not been is owed its arrival: it pops in the first time it is genuinely on screen, however long
after it was mined that turns out to be.

The lifecycle is three steps and the middle one is the subtle part:

1. `addStar` creates the star with `seen: false`. Nothing else marks it — not being mined, not the
   sky being open, not a render that culls it away.
2. The frame that actually draws it gives it the pop class. It is marked seen only `STAR_POP_MS`
   later, on a timer in `SkyCanvas`. Marking on the drawing render would drop the class on the very
   next commit and cancel the animation it was meant to allow; marking on `animationend` would never
   fire under `prefers-reduced-motion`.
3. `markSeen` returns how many actually changed, so the renderer's timer republishes the snapshot
   only when something did. Otherwise every idle tick would rebuild the cluster trees for nothing.

Two consequences worth keeping: an unseen star that is off screen stays unseen, so it pops when you
pan to it rather than silently while you were elsewhere; and at the far view no star is drawn at
all, so `Lobe.unseen` is what carries the news up to the cloud layer — a lobe holding unshown cards
breathes, and zooming into it resolves the breathing into individual arrivals.

## What a platform has to supply

The shared code takes numbers and returns numbers. A host provides:

1. **A `Viewport`** — `{ width, height }` in whatever px it measures in. Need not be square; the
   camera handles a phone's aspect. On the web `useCamera` measures its own element with a
   `ResizeObserver`; a native host passes its canvas size.
2. **Pointer coordinates**, relative to the viewport's top-left. Web: `localOf` in
   `components/sky/useCamera.ts`. Native: whatever the gesture recogniser reports.
3. **A zoom multiplier.** `zoomAround` takes a factor, deliberately — not a wheel delta. Web turns
   `deltaY` into `Math.exp(-deltaY * ZOOM_PER_WHEEL_PX)`; a pinch handler passes its scale change
   straight through. Neither gesture's feel leaks into the shared maths.
4. **A hue preset.** One of `SKY_PALETTES` (`palette.ts`), which the host resolves from the reader's
   setting and **passes down explicitly** — the ramp is an argument to `groupTint`, `starColor`,
   `buildClouds` and `indexSky`, never a module read. There is deliberately no "set the active
   palette" call: mutable module state here would be shared across SSR requests on the web and
   invisible to React's dependency graph, and the cloud tints live in the quadtrees, so the palette
   has to be a *dependency* of building them. Switching preset re-indexes once (~26ms at the
   5000-card quota) and costs nothing per frame afterwards. Presets carry colour only — radius,
   glow and silhouette are the same in every sky, because they are what makes a rank legible.
5. **A renderer.** `viewOf` returns the visible world rectangle as numbers. SVG formats that into
   a `viewBox` (see `viewBoxOf` in `SkyCanvas.tsx`); a Skia or Canvas host uses it as a transform.
   For the cloud layer it also needs a soft radial falloff per lobe — SVG does it with a gradient
   per lobe keyed on `Lobe.id`, which is why that id has to be stable; a Canvas host would use
   `createRadialGradient` and needs no ids at all.

## Known gaps for the mobile port

- **No pinch gesture yet.** The maths is ready — `zoomAround` is factor-based — but only a wheel
  handler exists, and it lives in the web hook.
- **`VIEWPORT_W_PX` / `VIEWPORT_H_PX` are still in `config.ts`.** They are only the web demo's
  chosen size and the fallback until the element is measured; nothing in `camera.ts` reads them.
  Do not reintroduce either as a law — a phone's window is neither of these shapes.
- **Screen-px constants are shared but unscaled.** `STAR_PX`, `HIT_PX`, `HOVER_*` are in
  device-independent px and will want a density factor on a phone, where a 7px tap target is
  smaller than a fingertip. `HIT_PX` in particular should probably grow for touch.
