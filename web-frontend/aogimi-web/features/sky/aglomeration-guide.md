i dont need such a feature on decks, i just want a proof of concept, generate 2 distinc units and apply teh instructions

create another tier of aglomeration, should just be a mesh, i have more things for the proof of concept maybe i will show them now

this is the md

# Aogimi — Sky component · reproduction print

**Source of truth: `Aogimi - Sky Density Test.dc.html`.** Where `Aogimi - Sky.dc.html`
differs, the density-test version wins (§12 lists the deltas so you don't accidentally port
the older one).

This is **not** an implementation plan. It is a print of exactly what the reference produces:
every constant, every formula, every layer, in draw order. You already have star data
(position, mastery rank) and constellation generation — none of that is described here.
What is described is: how a star is _drawn_, how it _scales_, how many of them _survive_ at a
given camera, what replaces the ones that don't, and how the whole thing behaves under zoom.

Reference captures in `ref/`:

| file             | camera                                           |
| ---------------- | ------------------------------------------------ |
| `01-fit.png`     | whole sky, fitted (`zout` = 1)                   |
| `02-out-074.png` | one wheel step out                               |
| `03-out-055.png` | two steps out                                    |
| `04-out-041.png` | three steps out                                  |
| `focus.png`      | Jōyō Atlas focused — LOD off, 168 stars + labels |

---

## 1 · Stage, coordinates, camera

```
WORLD          W = 2400, H = 1400        (fixed; all star coords live here)
SVG            viewBox "0 0 2400 1400"   preserveAspectRatio "xMidYMid slice"
               width 100% height 100%    display block
CONTAINER      position absolute; inset 0; overflow hidden; touch-action none
               cursor grab / grabbing while dragging
```

Camera is `{ x, y, s }` — a world-space centre point plus a zoom multiplier.

```
fit  f   = MAX(viewW / 2400, viewH / 1400)      ← MAX, because the viewBox slices
K        = f * s                                 world→screen scale
u(px)    = px / K                                screen px expressed in world units
```

**`u()` is load-bearing.** Every stroke width, every radius floor, every label offset, every
line-trim distance goes through it, so those quantities stay constant _on screen_ while the
world scales underneath. Anything that does _not_ go through `u()` (deck labels, dust radii,
nebula ellipses) is deliberately world-fixed and grows with zoom.

The whole scene sits in one transformed `<g>`:

```
transform  translate(2400/2 - cam.x*cam.s , 1400/2 - cam.y*cam.s) scale(cam.s)
transition transform {dur} cubic-bezier(.28,.64,.31,1)      — none while dragging
dur        = (0.18 + motion * 0.09) s     motion 1…10, default 5 → 0.63s
```

Note the translate is _not_ multiplied by `f` — it's inside SVG user space, so `f` is already
applied by the viewBox.

Star world position: `abs(deck, card) = { deck.ox + card.x * deck.sc , deck.oy + card.y * deck.sc }`,
`sc = 0.62` for every deck in the reference.

---

## 2 · The star — form vocabulary by mastery rank

Four ranks. Rank drives **colour, radius, glow strength, and silhouette** — the silhouette
change is the important part: you can read a star's rank from its shape alone, colourblind or
at 20% opacity.

| k   | label    | Midnight  | Ink-on-paper | base r | glow | silhouette                        |
| --- | -------- | --------- | ------------ | ------ | ---- | --------------------------------- |
| 0   | New      | `#7E78E0` | `#6f68cc`    | 4.2    | .10  | bare dot                          |
| 1   | Recent   | `#A98BFF` | `#8a63e8`    | 5.2    | .14  | bare dot                          |
| 2   | Learned  | `#FF7AC4` | `#e0489c`    | 6.4    | .20  | dot + 4-arm cross                 |
| 3   | Mastered | `#F4DC82` | `#c9962a`    | 7.6    | .26  | double 4-point sparkle, twinkling |

### 2.1 Screen radius

```
rr = u( rank.r  ×  (isFocus ? 1 : 0.86)  ×  cam.s^0.42  ×  (fulcral ? 1.55 : 1) )
```

`rr` is in world units; on screen it measures `rank.r × 0.86 × s^0.42` px. **The 0.42 exponent
is the whole feel of the zoom** — stars swell sublinearly, so zooming in reveals _more_ stars
rather than just bigger ones, and zooming out never collapses them into invisible specks.

- `× 0.86` whenever the deck is not the focused one.
- `× 1.55` for **fulcral** stars (§6) — the one star that stands in for a collapsed group.
- The mastered core circle is drawn at `rr × 0.6` — the sparkle arms carry its visual mass, so
  the dot shrinks to keep the total ink right.
- Selected star: core `× 1.22`.

### 2.2 Draw order inside one star group

1. **glow** — `circle r = rr*4.6`, `fill url(#rg{k})`, opacity `dim ? glow*1.4 : min(.85, glow*3)`
2. **k = 3 sparkle, back** — `sparklePath(x, y, rr*2.1, rr*2.1, rr*0.42)`, rotated 45°, opacity `dim ? .20 : .42`
3. **k = 3 sparkle, front** — `sparklePath(x, y, rr*3.2, rr*3.2, rr*0.86)`, upright, opacity `dim ? .50 : .95`
4. **k = 2 cross** — 4 arms `[0,-1] [1,0] [0,1] [-1,0]`, from `rr*0.92` to `rr*1.95`,
   `stroke-width max(u(.6), rr*.135)`, round caps, opacity `dim ? .34 : .72`
5. **hover ring** — `r = rr + u(9)`, stroke `T.btn`, width `u(1.4)`, opacity .6
6. **selected** — ring `r = rr + u(13)` width `u(1.8)` opacity .95, plus a second glow `r = rr*5.6` opacity .9
7. **core** — `circle r = cr`, fill rank colour, opacity `dim ? .55 : 1`, `transition r .25s, opacity .3s`
8. **specular** — `circle` at `(x - cr*.22, y - cr*.22)`, `r = cr*.4`, white,
   opacity `(dim ? .25 : k >= 2 ? .65 : .45) × (night ? 1 : .55)`
9. **word label** _(focused deck only)_ — `x + rr + u(11)`, `y + u(4.5)`, `font-size u(13.5)`,
   weight 600, fill `T.starlabel`, opacity `selected ? 1 : .85`
10. **hit target** — transparent `circle r = rr + u(16)`; `pointer-events` only when focused;
    `stopPropagation` on pointerdown so it never starts a drag

`dim = !isFocus && !isKey && !fulcral`. `isKey` = membership in the deck's hand-picked `key[]`
list — the handful of stars that stay bright when the deck is a distant silhouette.

### 2.3 `sparklePath` — the mastered star

Four-point star from four quadratic segments. `lv`/`lh` are the vertical/horizontal arm
lengths, `w` the waist:

```
c = 1.4142*w − 0.25*(lv + lh)
M (0,−lv) Q (c,−c) (lh,0) Q (c,c) (0,lv) Q (−c,c) (−lh,0) Q (−c,−c) (0,−lv) Z      (offsets from x,y)
```

Because `c` goes _negative_ as the arms grow, the waist pinches inward — that concavity is what
makes it read as a star rather than a diamond.

### 2.4 Twinkle

Rank 3 only. `animation: tw 3.8s ease-in-out infinite` where `@keyframes tw { 0%,100% {opacity:1} 50% {opacity:.5} }`,
`animation-delay: −(((deckIndex*5 + starIndex*3) % 8) × 0.47)s` — a deterministic 8-phase
stagger so no two neighbours pulse together and nothing needs a random seed.

### 2.5 Glow gradient (`rg0`…`rg3`, one per rank)

`radialGradient`: `0% → rankColour @ .5`, `38% → @ .16`, `100% → @ 0`.

---

## 3 · Trails — the mastery meter

Every star drags a short arc **concentric to a single celestial pole at world `(200, −500)`**,
i.e. above and left of the stage. One shared pole means all trails curve the same way and the
sky reads as one slowly rotating dome instead of a field of comets.

```
TF        = [0, .26, .58, 1]                              ← trail length per rank
trailF(k,g) = TF[k] + (TF[k+1] − TF[k]) × (g/100) × 0.85  ← g = % progress to next rank
                                                             k = 3 forces g = 100 → f = 1
skip if f ≤ .02   (a brand-new star has no trail at all)

R  = hypot(p − pole)          a0 = atan2(p − pole)
L  = u(42) × f                                            ← full-length trail = 42 screen px
```

Each trail is **3 stacked arcs** (4 for mastered), drawn as SVG `A R R 0 0 0 x2 y2` where the
endpoint is `p` rotated about the pole by `Δ = −L·t₀/R`:

| #                | t₀ (length) | t₁ (opacity) | t₂ (width) |
| ---------------- | ----------- | ------------ | ---------- |
| 1                | 1.00        | .12          | 1.00       |
| 2                | 0.58        | .22          | 0.80       |
| 3                | 0.26        | .42          | 0.56       |
| 4 _(k = 3 only)_ | 1.28        | .10          | 0.34       |

```
stroke-width = max( u(0.5), rr2 × 0.82 × t₂ )      rr2 = u(rank.r × (isFocus?1:.86) × s^.42)
                                                          ← note: no fulcral 1.55× here
opacity      = (dimT ? .5 : 1) × t₁ × (night ? 1 : .8)
dimT         = !isFocus && star not in deck.key
```

Stacking short-bright over long-faint gives a tapered comet without a gradient stroke. The
mastered star's 4th arc overshoots the other three by 28% and is the faintest — that overshoot
is what makes gold stars visibly _streak_ at a glance across the whole sky.

Trails are drawn **only for stars that survive LOD** (§6).

---

## 4 · Constellation lines

Two independent line layers.

**A · Real edges** — from the deck's `pairs[]`, drawn only when _both_ endpoints survive LOD.

```
trim each end by  rOf(c) = u(rank.r × (isFocus?1:.86) × s^.42) + u(7)
skip if  len ≤ rA + rB + u(4)
stroke        hue.line   (default T.line: #8fa0bb night / #8b99b3 light)
stroke-width  u(isFocus ? 1 : 1.2)
dasharray     u(2.6) u(5.2)      round caps
opacity       focused .42 · deck-hovered .58 · otherwise .38
transition    opacity .3s
```

**B · Cluster skeleton** — the far-view stand-in. Each **fulcral** star links to its **2 nearest
fulcral neighbours** (deduped by sorted index pair), trimmed `u(9)` at both ends, skipped when
`len ≤ u(9)*2.2`. Same dash and colour, `stroke-width u(1.1)`, opacity `.34` (`.5` on deck hover).

This is what keeps a collapsed 300-star deck looking like a _drawing_ rather than a smear: the
real edge graph disappears with its stars, and a coarser graph over the survivors takes its
place at the same visual weight.

---

## 5 · Ambient layers

**Sky background** (on the container, behind the SVG). The reference forces the **night palette
inside the sky box regardless of page theme** — the light theme only reaches the page chrome.

```
night   radial-gradient(115% 95% at 32% 6%, rgba(skyTint,.30) 0%, transparent 62%), T.bg
T.bg    radial-gradient(120% 100% at 30% 8%, #16223c 0%, #0d1526 42%, #05070f 100%)
skyTint palette-dependent; default #7E78E0
```

**Dust** — 220 fixed points, LCG seeded `1337` (`seed = (seed*1664525 + 1013904223) >>> 0`):

```
x = rnd()*2400   y = rnd()*1400   r = rnd()*1.9 + 0.5   opacity = rnd()*0.32 + 0.06
every 9th point → rank-3 gold      every 7th → rank-1 violet      else T.dust (#8496b4)
```

World-fixed, so dust scales with zoom (correct — it's the _sky_, not UI). Group drops to
opacity .5 while a deck is focused.

**Nebula veils** — 3 ellipses per deck, positioned off the deck's bbox, gradient stops
`0% @ .30 · 55% @ .10 · 100% @ 0`:

|     | cx           | cy           | rx      | ry      | opacity      |
| --- | ------------ | ------------ | ------- | ------- | ------------ |
| nb0 | `bx − w*.18` | `by − h*.12` | `w*.62` | `h*.60` | `nbOp`       |
| nb1 | `bx + w*.26` | `by + h*.24` | `w*.50` | `h*.48` | `nbOp × .9`  |
| nb2 | `bx + w*.05` | `by + h*.40` | `w*.34` | `h*.30` | `nbOp × .55` |

`nbOp = night ? 1 : .5`. Colour pair cycles per deck: `di % 3` → `[nbP,nbV] [nbV,nbT] [nbT,nbP]`,
third always `nbG`. Palette `['#FF7AC4','#7E78E0','#4EC9D4','#F4DC82']` by default.

**Deck hover halo** — `ellipse cy = bcy + 40, rx = bw/2 + 150, ry = bh/2 + 130`, `haloGrad`
(`T.btn` at .16 / .06 / 0), opacity 0 → .85, transition .35s.

**Deck label** — `text` at `(bcx, by1 + 62)`, `font-size 52` **world units** (so it scales with
zoom, unlike everything else), weight 600, fill `T.decklabel`, opacity .82 → 1 on hover, .45
when a different deck is focused.

**Deck hit zone** — invisible `ellipse cy = bcy + 55, rx = bw/2 + 70, ry = bh/2 + 105`,
`cursor pointer`, click → focus that deck, `stopPropagation` on pointerdown.

Non-focused deck groups fade to **opacity .28** when any deck is focused (transition .45s).

---

## 6 · Agglomeration — the star LOD

**This is the feature.** Everything above is decoration on top of it.

The premise: a deck gets a **fixed budget of individual stars on screen**, regardless of how
many it actually has. If it needs more than the budget, groups of stars collapse — each
collapsed group becomes **one nebula lobe plus one surviving "fulcral" star** (its most central
member). A 10-star deck therefore stays fully drawn forever; a 300-star deck resolves into
clusters. The budget is what equalises them.

```
starBudget    B  = 14      individual stars a deck may spend    (tunable 6…40)
starSpacing      = 22 px   screen px a star needs to itself     (tunable 10…60)
```

### 6.1 Build phase (cached, per deck, never per frame)

Cache key is `[ox, oy, sc]` — invalidate only when the deck moves or its data changes.

**`formTree(di)`** — a quadtree over **only the deck's dominant-rank stars**
(`domRank = argmax(deck.mix)`); if fewer than 4 of those exist, fall back to all stars.

> Using only the dominant rank is deliberate. The cloud's _shape_ is then the shape of what the
> deck mostly is — a mastered deck's silhouette is drawn by its gold stars, a young deck's by
> its violet ones — instead of a generic blob of everything.

**Root**: square, side `max(bboxW, bboxH) × 1.02 + 2`, centred on the bbox centre. Square keeps
child cells square so the screen-span test behaves identically on both axes.

**Node aggregates** (one pass):

```
count                     number of points
cx, cy                    centroid
tx0,ty0,tx1,ty1           TIGHT bbox of the points (NOT the cell bounds)
hist[4]                   star count per rank
sd  = max(1.2, sqrt( mean squared distance from centroid ))     ← the visual radius source
dens = min(1, ln(1+count) / ln(25))                              ← 0…1 density weight
id   = parentId + '-' + quadrantIndex                            ← STABLE across frames
leaf when count ≤ 2 or depth ≥ 6
split at the cell midpoint into 4 quadrants, keep non-empty children only
```

Two things that will silently ruin this if you get them wrong: keep **both** boxes (tight for
measurement, cell for splitting), and keep `id` stable — it is the React key, the gradient id,
and the thing every crossfade transition hangs off.

`sd`, not the bbox, is what sizes lobes. A bbox-sized lobe looks like a grid cell; an
`sd`-sized one looks like where the mass actually is.

### 6.2 Finding the collapse span

```
lodSpan(root, K, budget):
  S = starSpacing                      # 22
  repeat up to 28 times:
    shown = count(S)                   # see below
    if shown ≤ budget: return S
    S *= 1.14
  return S

count(S):  walk(n):
             span = max(n.tx1−n.tx0, n.ty1−n.ty0) × K       # SCREEN px
             if n.count ≥ 3 and span < S:  → 1              # collapses to one star
             if leaf:                      → n.count
             else recurse
```

`S` is a **collapse threshold in screen pixels**, grown geometrically until the deck fits its
budget. Two consequences worth internalising:

- **A node only ever collapses if it holds ≥ 3 points.** Pairs and singletons never
  agglomerate. This is precisely why the small decks (10–12 stars, whose leaves hold 1–2
  points) stay legible as drawings at every zoom while the dense deck dissolves.
- Zooming out shrinks every `span`, so more nodes clear the base `S = 22` on their own and the
  loop stops early. Zooming in inflates spans, nodes stop clearing, groups split, stars return.
  No mode flag anywhere — the same expression produces every state.

### 6.3 `starLOD(deck, K, isFocus)`

Returns `{ show:Set, fulcral:Set, clouds:[], fpts:[] }`. **If the deck is focused it returns
`show: null` and no clouds — LOD is off entirely and every star draws** (see `focus.png`).

```
1  GOLD QUOTA — a spread of top-rank stars always survives
     yCap = min(#rank3, max(2, round(B × 0.35)))          # ≈ 5 at B=14
     step = max(1, floor(#rank3 / yCap))
     take every step-th rank-3 star until yCap → show + fulcral
     (evenly sampled by index, so they spread across the field instead of clumping)

2  sp = lodSpan(formTree, K, max(3, B − show.size))

3  WALK formTree, collecting nodes where (count ≥ 3 && span < sp) || leaf

4  PER NODE
     if pts < 3 or span ≥ sp:  show every star in it; no cloud
     else:
       fulcral star = the point nearest the node centroid → show + fulcral
       emit ONE cloud for the group
```

**Cloud tint histogram is sampled by radius, not by tree membership.** For a node, count _all_
stars of _any_ rank within `max(sd × 1.7, 30)` world units of the centroid:

```
if hist[domRank] == 0:  hist[domRank] = pts.length     # the form's own rank always registers
hist[0] *= 1.45 ;  hist[1] *= 1.3                      # let the low-rank crowd show through
```

The two boosts exist because rank 0/1 stars are visually the faintest and would otherwise be
erased from the blend by the `^2.6` exponent below. Without them every cloud converges to gold.

```
hot   = centroid of the rank-3 stars inside that radius (or null)
hotW  = min(1, (nGold / max(3, pts.length)) × 2.2)
frac  = (count − 1) / count                            # how much of the group was absorbed
```

**5 · Gap fill.** After collapsing, walk the rank ≤ 1 stars in index order `(j*7) % n` and admit
any that sit at least `(starSpacing × 2.0) / K` world units from _every_ already-shown star, up
to `max(4, round(B × 0.8))` of them. They join `fulcral`.

> Skipping this step is the single most common way to make the feature look broken. Without it
> the survivors cluster where the density is, the empty stretches go bare, and the deck reads as
> a ring of blobs instead of one continuous field. The gap fill is what makes a collapsed deck
> still look like a _place_.

### 6.4 Rendering a collapsed group

```
tint(hist):  w = hist.map(n => (n/total)^2.6);  weighted RGB mix of the four rank colours
```

The `2.6` exponent is mandatory. A plain average collapses every deck to the middle of the
palette and all clouds come out the same colour. With it, a mastered deck burns gold and a
young one stays violet. Compute it **per node**, never once per deck — per-node tint is what
makes a deck's interior visibly uneven as it subdivides.
_If you swap in a low-hue-spread palette (e.g. `H2 · Ginga silver`), raise the exponent or widen
the ramp endpoints, or the effect flattens out._

**Deck halo** — one per deck, at the `formTree` root centroid:

```
rx = root.sd × 3.0     ry = root.sd × 2.5     fill = tint(deck.mix)
stops   0% @ .34   58% @ .24   86% @ .11   100% @ 0        (night; light: .24/.16/.07/0)
absorbed = Σ (group.count − 1)
veil     = min(1, absorbed / (0.5 × deck.starCount))
dens     = min(1, deck.nCards / 1842)
opacity  = min(1, veil × (0.56 + 0.44 × dens))
transition opacity .45s ease      pointer-events none
```

`veil` ties the halo to _how much is actually hidden_ — a deck that hasn't collapsed anything
has no halo at all, and it fades in continuously as groups fold, so there is no pop.

**Per group** — `rr = max(u(8), node.sd × 2.4)`, `op = min(1, .34 + .66 × frac) × (.58 + .42 × node.dens)`:

| layer                          | geometry                                                       | opacity           |
| ------------------------------ | -------------------------------------------------------------- | ----------------- |
| lobe A                         | `cx, cy`, `rx = rr`, `ry = rr × 0.85`                          | `op`              |
| lobe B                         | `cx + rr*0.30`, `cy − rr*0.22`, `rx = rr*0.68`, `ry = rr*0.56` | `op × 0.6`        |
| gold core _(if `hotW > 0.25`)_ | at `hot`, `rx = rr*0.5`, `ry = rr*0.42`                        | `op × hotW × 1.2` |

Lobe gradient: `0% @ .48 · 44% @ .20 · 100% @ 0` (night; light `.34 / .14 / 0`).
Gold core gradient uses the rank-3 colour: `0% @ .40 · 55% @ .09 · 100% @ 0` (light: `.28`).

**The offset twin (lobe B) is not optional.** A single ellipse reads as a bubble; two
overlapping ellipses at slightly different sizes read as vapour. The `ry = rx × 0.85` squash
does the same job on each individual lobe.

The gold core is the payoff detail: a knot of mastered words _glints_ inside its cloud before
it resolves into readable stars.

All lobes are `pointer-events: none`. Only the deck's hit zone (§5) is clickable.

### 6.5 Frame cost

`O(visible nodes)`, not `O(stars)`. At the fitted camera the 168-star Jōyō Atlas draws roughly
14 stars + ~10 lobes; the 12-star decks draw ~7 stars + 1–2 lobes each. Build the trees once at
data load — rebuilding per frame is the one mistake that makes this slower than drawing every
star.

---

## 7 · Deck separation — why the dense deck never bleeds into the others

Three mechanisms, all necessary:

**1 · Clustering is strictly per deck.** Every quadtree is built from one deck's stars. No lobe,
no skeleton edge, and no tint ever spans two decks. Agglomeration cannot merge constellations
because it never sees them together.

**2 · Per-column / per-row cell sizing.** Deck positions are solved every time the box resizes:

```
per deck:   fw = max(bboxW, 29 × (name.length + 1))        # label width floor
            fh = bboxH + 150                               # label + trail room
gap = 240 world units
for cols = 1 … n:
    rows   = ceil(n / cols)
    cw[c]  = max fw over that COLUMN        ch[r] = max fh over that ROW
    gridW  = Σcw + (cols−1)·gap             gridH = Σch + (rows−1)·gap
    k      = min(availW*0.96 / gridW, availH*0.96 / gridH)
pick the cols with the largest k
place each deck's centroid at its cell centre, y − 75; centre a short trailing row
```

Sizing each column from its own occupancy (rather than one global max cell) is the fix that
matters: the 300-star deck gets a wide column to itself and the three small decks share narrow
ones, instead of every cell being inflated to the biggest constellation's size. Compare the
older `Aogimi - Sky.dc.html`, which uses a single `max fw × max fh` cell and `gap = 70` — the
small decks end up marooned in oceans of empty cell.

**3 · The gap is in world units.** 240 world units survives every zoom level, so the decks keep
their separation at `zout = 0.18` exactly as at `zout = 1`. In `04-out-041.png` the three gold
knots and the violet Jōyō field are still four distinct objects at 41% scale.

Deck positions moving sets `_layDirty`, which schedules a camera refit on the next non-drag
frame.

---

## 8 · Zoom choreography, end to end

The wheel is **quantised and discrete** — there is no continuous zoom. This is a deliberate
choice: it makes every intermediate state a designed state.

```
accumulate e.deltaY; act only when |acc| ≥ 70;  cooldown 700 ms between actions
```

| situation             | wheel | result                                                 |
| --------------------- | ----- | ------------------------------------------------------ |
| whole sky, `zout` = 1 | out   | `zout /= 1.35`, floored at **0.18**                    |
| whole sky, `zout` < 1 | out   | `zout /= 1.35` again                                   |
| whole sky, `zout` < 1 | in    | `zout *= 1.35`, capped at 1                            |
| whole sky, `zout` = 1 | in    | **focus the deck nearest the cursor's world position** |
| deck focused          | out   | back to the whole sky, `zout` reset to 1               |

`cam = skyCam() × zout`. `skyCam()` fits the union bbox of all decks — widened by each deck's
label half-width and `+128` at the bottom for the label — into `avail × 0.96`, clamps scale to
`[0.16, 2.2]`, and offsets by `(padL − padR)/2` / `(padT − padB)/2`.

`focusDeck(di)` reserves the left panel (`panelWidth + 44` when panels are shown, else 56),
`padR 56 · padT 34 · padB 48`, uses `avail × 0.90 / 0.94`, then
`k = min(availW/(bw+80), availH/(bh+100))` and `s = min(9, max(0.2, k/f))`.
_(The older Sky page floors this at 1.4 — don't port that; it over-zooms large constellations.)_

**Drag pan** — pointer capture, 3 px move threshold before it counts as a drag.
On release: at the whole sky with `zout ≥ 1`, the camera **snaps back** to `skyCam()`; focused,
it refits the deck. Panning is therefore rubber-banded — you can look around but the sky always
returns to frame. Panning is only free while zoomed out (`zout < 1`).

**What you see, in order, zooming in from the far camera** (`04-out-041` → `01-fit` → `focus`):

1. Four separated forms. The dense one is a violet field with ~14 bright stars and a lattice of
   dashed skeleton edges; the small ones are tight gold knots with legible dots.
2. Zooming in raises `K`; node spans exceed `sp`; groups split. Each split releases its stars,
   its lobe fades (`.45s`), and its fulcral star drops back to normal size (the `1.55×` goes
   away over the `r .25s` transition).
3. The real `pairs[]` edges reappear as their endpoints return — you get a _denser, finer_ line
   drawing, not a swapped layer.
4. At focus: LOD off, all stars, word labels, other decks at .28, the left panel opens.

The whole handover reads as the drawing emerging out of the cloud because the lobes fade on
absorbed-fraction (`frac`, `veil`) rather than on a zoom threshold — nothing is keyed to a
magic number that could be crossed all at once.

---

## 9 · Palette

Sky interior is always the Midnight palette. Page chrome follows the theme.

```
Midnight     ink #f2f1ee   soft #c9c8c4   muted #9b9aa2   faint #75747e
             btn #ffe085 / ink #141414    accent #c2452c   gold #ffe085   sNavy #8fa9d6
             line #8fa0bb  dust #8496b4   starlabel #cfd8ea   decklabel #e8edf8
             panel rgba(18,23,38,.80)  glass rgba(20,26,42,.62)
Ink on paper ink #141414   soft #4a4a48   muted #7d7c78   faint #a9a8a2
             btn #141414 / ink #ffffff    gold #a8811f    sNavy #3E5D86
             line #8b99b3  dust #7d8ba6   starlabel #3b4a66   decklabel #22304a
```

Alternate sky hues (`skyHue` prop) override the four rank colours, the nebula quad, the line
colour and the dust colour:

|                   | rank 0→3                          | nebula quad                       | line      | dust      |
| ----------------- | --------------------------------- | --------------------------------- | --------- | --------- |
| H2 · Ginga silver | `#48545C #8494A0 #DCE6EC #E0A448` | `#55636A #2D373B #B9C3C9 #C98F43` | `#6f7d85` | `#75838b` |
| H3 · Ember dusk   | `#4B316F #83405C #C25A45 #F0A13C` | `#C25A45 #2E2B64 #4B316F #F0A13C` | `#8a6f9e` | `#87759e` |
| H4 · Aurora field | `#5E324D #A863A8 #DCD0E4 #52D46A` | `#A863A8 #5E324D #46C05E #DCD0E4` | `#9d7fa0` | `#8f8a95` |

---

## 10 · Tunables

| name                 | default         | range   | effect                                                                                |
| -------------------- | --------------- | ------- | ------------------------------------------------------------------------------------- |
| `starBudget`         | 14              | 6 – 40  | individual stars a deck may show. **The main dial.** Lower = more cloud, fewer stars. |
| `starSpacing`        | 22 px           | 10 – 60 | base collapse span, and (×2.0) the gap-fill exclusion radius                          |
| `motion`             | 5               | 1 – 10  | camera transition duration `0.18 + m×0.09` s                                          |
| `showConstellations` | on              |         | both line layers                                                                      |
| `twinkle`            | on              |         | rank-3 pulse only                                                                     |
| `nebulaVeils`        | on              |         | the 3 per-deck ambient ellipses (independent of cluster lobes)                        |
| `starTrails`         | on              |         | trails                                                                                |
| `cloudClusters`      | on              |         | cluster lobes + deck halo (LOD star culling still applies)                            |
| `skyHue`             | palette default |         | §9                                                                                    |

---

## 11 · Failure modes

- **Rebuilding the quadtree per frame.** The tree depends only on data. Biggest perf trap.
- **Unstable node ids.** Breaks React keys, gradient references, and every crossfade.
- **Culling / measuring on cell bounds instead of the tight bbox.** Clouds appear over empty sky.
- **Sizing lobes from the bbox instead of `sd`.** Boxy, grid-shaped clouds.
- **Averaging tint colours without the `^2.6` exponent.** Every deck the same hue.
- **Dropping the `hist[0] *= 1.45 / hist[1] *= 1.3` boosts.** Every cloud goes gold.
- **Skipping the gap fill (§6.3 step 5).** Deck reads as a ring of blobs, not a field.
- **A single lobe ellipse instead of the offset twin.** Bubbles, not vapour.
- **Absolute stroke widths, radii or label offsets.** Everything thickens as you zoom — always
  go through `u()`.
- **Collapsing nodes with fewer than 3 points.** Small decks start agglomerating and lose their
  identity as drawings.

---

## 12 · Deltas vs `Aogimi - Sky.dc.html` (do not port the old version)

|               | Sky (older)                                                                                      | Sky Density Test (**use this**)           |
| ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| star culling  | none — every star always drawn                                                                   | budget-driven LOD (§6)                    |
| cloud trigger | zoom band: `cloudOp = clamp01((T + 0.42T·0.5 − s) / 0.42T)`, `T = 1.5`                           | absorbed fraction — no zoom threshold     |
| cloud source  | quadtree over **all** stars                                                                      | `formTree` over **dominant-rank** stars   |
| lobe geometry | one ellipse `rx = max(u(6), sd·1.9)`, `ry = rx·0.86`; plus a plus-cross accent when `dens > 0.5` | offset twin + gold hot core (§6.4)        |
| fulcral stars | none                                                                                             | yes, `1.55×`, plus cluster skeleton       |
| sky theme     | follows page theme                                                                               | always night inside the box               |
| deck packing  | one global max cell, `gap 70`, cols ∈ {3,2,1}                                                    | per-column/row cells, `gap 240`, cols 1…n |
| focus zoom    | floored at `1.4`                                                                                 | floored at `0.2`                          |

**Dead code in the density-test file** — present but never reached; delete on port:
`cloudTree()`, `lobes()`, `coreShape()`, `hull()`, `smoothPath()`, and the locals `cloudOp`,
`minSpan`, `cloudSwitch()`, `cloudDetail()` inside `buildSky`. They are leftovers from the
older zoom-band algorithm.

`clustering-spec.md` at the project root describes that **older** algorithm (zoom-band
crossfade with separate `cloudOp` / `lineOp` / `starOp` weights). It is superseded by this
document; its §1 quadtree build, §3.1 tint exponent and §8 failure modes still hold.

and with the html file

tell me what u think about it
how easy/hard to adapt to current project
