// ═══════════════════════════════════════════════════════════════════════════
// THE PALETTE — Night ("Sakura Yozora") + Day ("Daybreak Glow")
// ═══════════════════════════════════════════════════════════════════════════
//
// Two columns, one set of keys. `PALETTES.day` / `PALETTES.night` are the whole
// of it, and `ThemeContext` picks one per render. A key present in one column
// and missing from the other is a **compile error**, which is the point of the
// `Palette` type — nothing else forces the columns to agree.
//
// Values come from `design-handoff/2026-09-16-foundations/DESIGN.md` verbatim
// wherever it states one. Where it states a Night value and no Day counterpart,
// the Day column takes the value drawn in the corresponding `*.dc.html`
// composition; where neither exists the key is marked `[derived]` at its
// definition and is a data point for the owner, not a licence to invent more.
//
// ── The surface contract (read this before recolouring) ────────────────────
// The app is **liquid glass over a sky gradient**. Nothing is an opaque panel
// any more:
//
//   · `bg` + `canvasTop/canvasBottom` + `nebula/aurora/bloom` are the canvas.
//     Only `shared/components/Screen` paints them. No screen paints its own.
//   · `glassSubtle/Standard/Frosted/Intense` are the four elevation tiers. A
//     surface picks a tier, adds `glassBorder`, and — Night only — the
//     `glassRim` inset top hairline. **Glass never sits on glass of the same
//     tier**: a card is Tier 2, the plates inside it are Tier 1.
//   · `ink` → `muted` → `faint` is the whole ink ramp. DESIGN.md has three
//     steps, not four; `soft` is kept as an **alias of `muted`** so the ~49
//     legacy `useColors()` screens keep compiling, and is not a distinct step.
//   · Anything named `*Ink` is the ink that sits ON the same-named fill, so the
//     pair contrasts with each other rather than with the canvas.
//   · `btn` is the primary action (sakura in both columns). `accent` is the
//     *emphasis* hue — text links, active icons — and is the one that differs:
//     sakura on Night, deep rose on Day, because pale sakura text is illegible
//     on a light canvas.
//
// ── Alpha values ────────────────────────────────────────────────────────────
// Nearly everything here is alpha, because glass is alpha. The two columns
// carry their own: a white wash reads on Night's indigo and disappears on Day's
// warm white, where the wash has to run the other way (opaque white over the
// canvas rather than white-on-dark).
//
// ── What is deliberately NOT here ──────────────────────────────────────────
//   · **The mastery ladder.** Rank colours live in `features/sky/map/lib/
//     palette.ts` (`RANK_COLORS` / `SKY_PALETTES`) and are the single copy —
//     `verify:sky` asserts that module matches the web's. The redesign brief
//     (§2) keeps our star colours over the handoff's, so do not re-declare the
//     four hexes here and do not point chrome at DESIGN.md's ladder.
//   · **The dock's material.** `features/app-shell/**` owns it and records why.
//   · **Per-book spine colours.** `cover1..4` is the whole of it: four tints
//     keyed off the stored `cover_color`, unchanged by the redesign.
//
// ── The sky stays night in both columns ────────────────────────────────────
// `sky1..3` and `deckSky` are dark in Day too, because stars are drawn on them.
// They are now the canvas gradient's own stops, so a sky panel reads as a
// window onto the same sky the app sits on.
//
// ── One deviation from the redesign brief's §3.2 ───────────────────────────
// The brief names the glass/glow/srs/jlpt groups as nested objects
// (`glass.subtle`). They are **flat** here (`glassSubtle`) because `Palette` is
// a mapped type over `string` values, and that mapping is what makes a missing
// key in one column a compile error. Flat keys keep that guarantee; nesting
// would trade it for prettier names.

import { Platform } from 'react-native';
import { SWITZER_AVAILABLE } from './switzer';

/**
 * The colour contract. Both columns implement it exactly; `Palette` is derived
 * from Night so adding a key there forces Day to follow.
 *
 * Mapped over `typeof NIGHT` rather than aliasing it, so the **keys** are
 * pinned while the **values** widen to `string` — a straight alias would make
 * Night's literal hexes the type and reject every Day value.
 */
export type Palette = { readonly [K in keyof typeof NIGHT]: string };

/**
 * **Night — "Sakura Yozora."** The default. Deep indigo sky, a magenta nebula
 * above and a blue aurora below, white-tint glass floating over it, and sakura
 * pink as the single luminous accent.
 */
const NIGHT = {
  /* ── Canvas ────────────────────────────────────────────────────────────────
     `bg` is the flat fallback (overscroll, a view that has not mounted
     `Screen` yet); the gradient and the two radials are the real thing. */
  bg: '#0F0E1E',
  canvasTop: '#1A1633',
  canvasBottom: '#0F0E1E',
  /** Magenta radial, top. Dialled well down from DESIGN.md's 0.28 — the
   *  handoff wash read as a colour cast over the whole screen on device. */
  nebula: 'rgba(190, 90, 160, 0.10)',
  /** Blue radial, bottom. Likewise down from the handoff's 0.26. */
  aurora: 'rgba(90, 120, 200, 0.09)',
  /** Third radial — Day only (leaf, bottom centre). Transparent on Night,
   *  which is a two-radial canvas. */
  bloom: 'rgba(90, 120, 200, 0)',

  /* ── Ink — three steps, most-contrast first ───────────────────────────────
     `soft` is an alias of `muted`, not a fourth step. See the header. */
  ink: '#F4EFF5',
  soft: 'rgba(244, 239, 245, 0.62)',
  muted: 'rgba(244, 239, 245, 0.62)',
  faint: 'rgba(244, 239, 245, 0.50)',

  /* ── Primary action — sakura in both columns ──────────────────────────────
     The one fill that does not flip: `#F2B8C6` with `#2A1A24` ink reads on
     either canvas, which is why the handoff uses it for the CTA in both. */
  btn: '#F2B8C6',
  btnInk: '#2A1A24',

  /* ── Accent — emphasis, not fill ──────────────────────────────────────────
     Text links, active icons, card eyebrows, progress fills. `accentInk` is
     the ink drawn ON an accent fill. */
  accent: '#F2B8C6',
  accentInk: '#2A1A24',

  /** "This is the selected one" — a separate role from `accent`, which is
   *  emphasis. Tracks it today; kept apart so the two can diverge. */
  active: '#F2B8C6',
  activeInk: '#2A1A24',

  /* ── Supporting accents ───────────────────────────────────────────────────
     Due badges and count bubbles (`accentDeep`), deck sub-labels and
     learned/mastered states (`accentSky`, `accentLeaf`), the avatar gradient's
     far end (`accentTrunk`). */
  accentDeep: '#D97A93',
  accentSky: '#A9D3EA',
  accentLeaf: '#8FC7A0',
  accentTrunk: '#6B4A3A',

  /* ── Glass tiers — the four elevations ────────────────────────────────────
     1 inputs and nested plates · 2 cards, rows, icon and secondary buttons ·
     3 popovers and pressed Tier 2 · 4 sheets and modals. `theme/glass.ts`
     turns a tier into a full recipe; nothing should read these directly. */
  glassSubtle: 'rgba(255, 255, 255, 0.04)',
  glassStandard: 'rgba(255, 255, 255, 0.07)',
  glassFrosted: 'rgba(255, 255, 255, 0.12)',
  glassIntense: 'rgba(255, 255, 255, 0.18)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  /** The specular inset hairline along a pane's top edge. Night only — Day's
   *  glass is opaque white and has no rim to catch. */
  glassRim: 'rgba(255, 255, 255, 0.22)',
  /** Accent glass — the focused deck node, a selected row, the sky icon
   *  plate. Reserved; a card never takes it. */
  glassAccent: 'rgba(242, 184, 198, 0.12)',
  glassAccentBd: 'rgba(242, 184, 198, 0.30)',

  /* ── Glows ────────────────────────────────────────────────────────────────
     Shadow colours, not fills. RN takes one shadow per view, so these are
     spent on the primary CTA and the progress fill's leading edge. */
  glowPrimary: 'rgba(242, 184, 198, 0.28)',
  glowProgress: 'rgba(242, 184, 198, 0.60)',
  glowNode: 'rgba(242, 184, 198, 0.35)',

  /* ── Progress ─────────────────────────────────────────────────────────────
     A track visible while empty; the fill is the primary sakura. */
  track: 'rgba(255, 255, 255, 0.12)',
  fill: '#F2B8C6',

  /** The avatar is a `accentDeep → accentTrunk` gradient; this is its start
   *  stop, kept as its own key because a flat fallback still needs one. */
  avatar: '#D97A93',
  avatarInk: '#F4EFF5',

  /* ── Destructive ──────────────────────────────────────────────────────────
     `danger` doubles as text; the other two are the wash and edge under it. */
  danger: '#E8707A',
  dangerBg: 'rgba(232, 112, 122, 0.12)',
  dangerBd: 'rgba(232, 112, 122, 0.35)',

  /* ── Caution ──────────────────────────────────────────────────────────────
     The SRS "Hard" hue, which is the only amber the system has. */
  warn: '#E08E45',
  warnBg: 'rgba(224, 142, 69, 0.18)',
  warnBd: 'rgba(224, 142, 69, 0.45)',

  /** Legacy "mastery / highlight ink". `legacyColors().success` resolves here,
   *  and every one of those call sites means "high rank", so it takes the
   *  mastered green rather than the old gold. Redesigned screens read
   *  `RANK_COLORS` instead and this key retires with the bridge. */
  gold: '#8FC7A0',

  /* ── SRS grades — semantic, fixed across themes ───────────────────────────
     Rendered as tinted tiles, never solid: fill at 0.18, border at 0.45, label
     in the grade colour. `srsGood` is FSRS's third grade; the old `Medium`
     name is the handoff's and does not survive. */
  srsAgain: '#D9534F',
  srsHard: '#E08E45',
  srsGood: '#4A90E2',
  srsEasy: '#5CB85C',

  /* ── JLPT level badges ────────────────────────────────────────────────────
     6px chips: fill at 0.16, border at 0.35, label in the level colour. The
     level *is* the colour's meaning, which is why these are tokens and not a
     ramp. */
  jlptN1: '#E8707A',
  jlptN2: '#E08E45',
  jlptN3: '#A9D3EA',
  jlptN4: '#8FC7A0',
  jlptN5: 'rgba(255, 255, 255, 0.35)',

  /* ── Tints + border weights ───────────────────────────────────────────────
     Neutral washes that layer over covers and images. `bdA` is the strong edge
     (a pane against the canvas), `bdB` the weak one (a divider inside one). */
  tintA: 'rgba(255, 255, 255, 0.12)',
  tintB: 'rgba(255, 255, 255, 0.04)',
  bdA: 'rgba(255, 255, 255, 0.22)',
  bdB: 'rgba(255, 255, 255, 0.08)',

  /* ── Legacy surface ladder → the glass tiers ──────────────────────────────
     These three were the opaque card/inset/hairline set. They now alias Tier 2
     / Tier 1 / the glass border so every unmigrated screen picks up the new
     material for free. A redesigned screen uses `Glass` or `Card`, not these. */
  /** Cards, rows, sheets — Tier 2. */
  paper: 'rgba(255, 255, 255, 0.07)',
  /** Chips, wells, badges — Tier 1, an inset *within* a card. */
  paperTile: 'rgba(255, 255, 255, 0.04)',
  /** The hairline edge of any glass pane. */
  paperBd: 'rgba(255, 255, 255, 0.14)',

  /** Edge that appears on a pane only once something needs to be seen. */
  cardBorderOn: 'rgba(255, 255, 255, 0.22)',

  /** Sheet / popover backdrop, paired with an 8px blur. */
  scrim: 'rgba(15, 14, 30, 0.55)',

  /** **Tier 4's fill when the pane is NOT over the canvas.**
   *
   *  `glassIntense` is a white *tint*: it only reads because Night's sky is
   *  behind it. A bottom sheet is a `Modal` and can be raised over anything —
   *  the reader's page is white, sepia or near-black by the reader's own
   *  choice — and an 18%-white film over a white page is nothing at all, which
   *  is why every sheet in the app used to read as a slightly milky scrim.
   *  This is the sheet's own ground, dense enough to be a surface wherever it
   *  lands, and it is the value the Reader compositions draw. */
  sheet: 'rgba(22, 19, 42, 0.78)',

  /* ── Book + deck covers ───────────────────────────────────────────────────
     Unchanged by the redesign: four tints keyed off the stored `cover_color`,
     which is shared data the web renders too. Only `covtrack` is alpha, since
     it sits ON the cover. */
  cover1: '#21385c',
  cover1Ink: '#e7dcc2',
  cover2: '#6b2a5e',
  cover2Ink: '#f6e2ef',
  cover3: '#4e8088',
  cover3Ink: '#e9f6f1',
  cover4: '#7a5a2e',
  cover4Ink: '#f4e9d4',
  covtrack: 'rgba(255, 255, 255, 0.16)',

  /* ── Night sky, top → base ────────────────────────────────────────────────
     **Dark in Day as well** — stars need night. These are now the canvas
     gradient's own stops, so a sky panel reads as a window onto the same sky
     the rest of the app floats on. `sky3` is the darkest; it is the fill behind
     overscroll. */
  sky1: '#1A1633',
  sky2: '#151229',
  sky3: '#0F0E1E',

  /** The deck card's own sky panel — the card's frame, not the star map. */
  deckSky: '#1A1633',
} as const;

/**
 * **Day — "Daybreak Glow."** The same sky at dawn: a warm sakura-white canvas
 * washed with sakura, sky-blue and leaf, opaque white glass over it, and deep
 * rose where sakura would be too pale to read.
 *
 * Two reversals worth knowing before reading values off this column: `accent`
 * is **deep rose**, not sakura (the fill stays sakura — see `btn`), and the
 * glass tiers run *opaque white over the canvas* rather than white-on-dark, so
 * a higher tier is more opaque rather than brighter.
 */
const DAY: Palette = {
  /** **Daybreak Glow's canvas.** A near-uniform sakura tint, broken up by three
   *  soft white washes.
   *
   *  **The ramp** carries the colour, so the tint is spread across the whole
   *  page rather than pooling anywhere: sakura `#F2B8C6` blended over the
   *  porcelain cream `#FAF6F4` at 10% at the top easing to 5% at the bottom.
   *  Pre-multiplied to opaque hexes — the ramp is the bottom layer, so there is
   *  nothing under it for alpha to reveal. To re-tune, recompute
   *  `base + (sakura - base) × a` per channel.
   *
   *  **The three washes are white**, not coloured. They lighten the ramp in a
   *  few places so it does not read as a flat fill, and that is all they do —
   *  every earlier attempt at *colouring* the canvas in patches read as blobs
   *  under the content. Lifting instead of tinting keeps the hue single and the
   *  variation structural.
   *
   *  They fade to **white at zero alpha**, never the keyword `transparent`
   *  (= zero-alpha *black*), which would drag a grey cast through the ramp on
   *  the way out. `Screen` fades each stop to its own colour; do not
   *  "simplify" that to a transparent stop.
   *
   *  Geometry and per-wash falloff are in `CANVAS.day`. */
  /** The bottom stop — also the flat fill behind overscroll, matching Night. */
  bg: '#FAF3F2',
  /** Sakura at 10% over the cream. */
  canvasTop: '#F9F0EF',
  /** Sakura at 5% over the cream. */
  canvasBottom: '#FAF3F2',
  /** Upper left — the broadest of the three. */
  nebula: 'rgba(255, 255, 255, 0.50)',
  /** Right, above centre. */
  aurora: 'rgba(255, 255, 255, 0.40)',
  /** Lower left. */
  bloom: 'rgba(255, 255, 255, 0.30)',

  ink: '#0E1326',
  soft: '#4D5875',
  muted: '#4D5875',
  faint: 'rgba(14, 19, 38, 0.50)',

  btn: '#F2B8C6',
  btnInk: '#2A1A24',

  /** Deep rose, not sakura: `#F2B8C6` as *text* on a white canvas is unreadable.
   *  The sakura fill lives on in `btn`, which is what the CTA uses. */
  accent: '#B84D67',
  accentInk: '#FFF9F7',

  active: '#B84D67',
  activeInk: '#FFF9F7',

  /** [derived for Day] DESIGN.md states these four for Night only, and the Day
   *  compositions reuse the same hexes as washes. Kept verbatim rather than
   *  darkened — they read as fills and sub-labels here, and as *text* on the
   *  light canvas `accentSky` and `accentLeaf` are weak. Flagged to the owner. */
  accentDeep: '#B84D67',
  accentSky: '#A9D3EA',
  accentLeaf: '#8FC7A0',
  accentTrunk: '#6B4A3A',

  /** Tier 1 is the composition's flat white inset; Tier 2 is DESIGN.md's Day
   *  glass. [derived] Tiers 3 and 4 have no documented Day value — DESIGN.md
   *  states one Day glass — and are stepped toward opaque, because a sheet that
   *  is no denser than the card behind it cannot be read over scrolling
   *  content. Flagged to the owner. */
  glassSubtle: '#FFFFFF',
  glassStandard: 'rgba(255, 255, 255, 0.72)',
  glassFrosted: 'rgba(255, 255, 255, 0.82)',
  glassIntense: 'rgba(255, 255, 255, 0.92)',
  glassBorder: 'rgba(14, 19, 38, 0.08)',
  /** Zero-alpha: "No specular rim" (DESIGN.md → Daybreak Glow → Glass). Kept
   *  as a transparent value rather than removed so the tier recipe stays one
   *  shape across the columns. */
  glassRim: 'rgba(255, 255, 255, 0)',
  glassAccent: 'rgba(184, 77, 103, 0.10)',
  glassAccentBd: 'rgba(184, 77, 103, 0.30)',

  /** The CTA glow survives into Day — the Day composition draws the same
   *  `rgba(242,184,198,0.28)` under `Start Review`. */
  glowPrimary: 'rgba(242, 184, 198, 0.28)',
  glowProgress: 'rgba(242, 184, 198, 0.60)',
  glowNode: 'rgba(184, 77, 103, 0.25)',

  track: 'rgba(14, 19, 38, 0.08)',
  fill: '#F2B8C6',

  avatar: '#D97A93',
  avatarInk: '#FFF9F7',

  danger: '#E8707A',
  dangerBg: 'rgba(232, 112, 122, 0.12)',
  dangerBd: 'rgba(232, 112, 122, 0.35)',

  warn: '#B56A2E',
  warnBg: 'rgba(181, 106, 46, 0.12)',
  warnBd: 'rgba(181, 106, 46, 0.40)',

  gold: '#3E8B3E',

  /** Each grade darkened ~20% for the light canvas — the four values the Day
   *  compositions draw. */
  srsAgain: '#B23B37',
  srsHard: '#B56A2E',
  srsGood: '#2F6FB8',
  srsEasy: '#3E8B3E',

  /** N1 and N3 are the Day dictionary composition's; N2 and N4 take the Day SRS
   *  values, which are the same two hues darkened by the same rule. */
  jlptN1: '#B23B37',
  jlptN2: '#B56A2E',
  jlptN3: '#2F6FB8',
  jlptN4: '#3E8B3E',
  jlptN5: 'rgba(14, 19, 38, 0.35)',

  tintA: 'rgba(14, 19, 38, 0.06)',
  tintB: 'rgba(14, 19, 38, 0.03)',
  bdA: 'rgba(14, 19, 38, 0.14)',
  bdB: 'rgba(14, 19, 38, 0.06)',

  paper: 'rgba(255, 255, 255, 0.72)',
  paperTile: '#FFFFFF',
  paperBd: 'rgba(14, 19, 38, 0.08)',

  cardBorderOn: 'rgba(14, 19, 38, 0.14)',

  /** Lighter than Night's: the Day compositions dim to `rgba(14,19,38,0.25)`
   *  behind a sheet, because a 55% wash over the warm canvas reads as the
   *  lights going out rather than as content stepping back. */
  scrim: 'rgba(14, 19, 38, 0.25)',

  /** The Day compositions' sheet ground — near-opaque white rather than the
   *  0.92 tint, for the same reason Night's is (see `sheet` above). */
  sheet: 'rgba(255, 255, 255, 0.96)',

  cover1: '#21385c',
  cover1Ink: '#e7dcc2',
  cover2: '#6b2a5e',
  cover2Ink: '#f6e2ef',
  cover3: '#4e8088',
  cover3Ink: '#e9f6f1',
  cover4: '#7a5a2e',
  cover4Ink: '#f4e9d4',
  covtrack: 'rgba(255, 255, 255, 0.16)',

  /** Night in Day too — stars need night. Same three stops as Night's. */
  sky1: '#1A1633',
  sky2: '#151229',
  sky3: '#0F0E1E',

  deckSky: '#1A1633',
};

/** The two columns. `ThemeContext` resolves one; nothing else should index this. */
export const PALETTES = { day: DAY, night: NIGHT } as const;

export type ThemeName = keyof typeof PALETTES;

/**
 * **Deprecated — the Night column as a static value.**
 *
 * Colour is per-theme, so the correct way to read it is `usePalette()`. This
 * alias exists only because ~25 modules read `palette.*` inside a module-scope
 * `StyleSheet.create`, which cannot call a hook. Those screens are therefore
 * **Night-locked** — it points at Night now rather than Day, because Night is
 * the default theme and locking to the non-default column was the worse of the
 * two failures.
 *
 * Do not add call sites. A screen being redesigned drops this for `usePalette()`
 * and builds its styles inside the component.
 */
export const palette = NIGHT;

// ─────────────────────────────────────────────────────────────────────────────
// The canvas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Where the canvas's radial washes sit, per column.
 *
 * The **colours** are palette tokens (`nebula` / `aurora` / `bloom`); this is
 * the **geometry**, which genuinely differs between the two skies: Night is two
 * radials on the vertical axis (nebula above, aurora below), Day is three
 * scattered washes. Keeping the geometry here rather than in `Screen` means one
 * renderer draws both, and re-aiming a wash is a token edit.
 *
 * All of these are fractions of the screen box: `rx`/`ry` are the ellipse's
 * radii, `cx`/`cy` its centre. They map straight onto SVG's `RadialGradient`
 * in object bounding-box units.
 *
 * `stop` is where the wash reaches zero — CSS's `transparent 70%`. It is
 * per-wash rather than a constant because the source specs set it per gradient,
 * and a wash that fades at 75% instead of 70% is a visibly softer edge.
 */
export type CanvasWash = {
  rx: number;
  ry: number;
  cx: number;
  cy: number;
  stop: number;
};
export type CanvasSpec = { nebula: CanvasWash; aurora: CanvasWash; bloom: CanvasWash };

export const CANVAS: Record<ThemeName, CanvasSpec> = {
  night: {
    nebula: { rx: 0.8, ry: 0.5, cx: 0.5, cy: -0.1, stop: 0.7 },
    aurora: { rx: 0.7, ry: 0.5, cx: 0.5, cy: 1.1, stop: 0.7 },
    // Transparent on Night (see `bloom` in the palette); the geometry is inert
    // but has to be *something*, and a degenerate ellipse is cheapest.
    bloom: { rx: 0.0001, ry: 0.0001, cx: 0.5, cy: 0.5, stop: 0.7 },
  },
  day: {
    // Three white lifts, spread so no two overlap much — the point is to break
    // the ramp's uniformity, not to build a second gradient out of them.
    nebula: { rx: 0.6, ry: 0.45, cx: 0.25, cy: 0.15, stop: 0.7 },
    aurora: { rx: 0.55, ry: 0.5, cx: 0.9, cy: 0.45, stop: 0.7 },
    bloom: { rx: 0.65, ry: 0.45, cx: 0.35, cy: 0.9, stop: 0.75 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// The legacy bridge
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeColors = {
  bg: string;
  bgElev: string;
  bgSunken: string;

  fg: string;
  fgMuted: string;
  fgSubtle: string;

  border: string;
  borderStrong: string;

  accent: string;
  accentSoft: string;
  accentFg: string;

  highlight: string;

  success: string;
  warning: string;
  error: string;

  backdrop: string;
  shadow: string;
};

/**
 * The legacy key → `Palette` mapping, in one place.
 *
 * **Why a bridge instead of a rename.** ~49 components do `const c = useColors()`
 * and read these keys ~600 times. Those screens are being rewritten one at a
 * time by the 2026-09 redesign, so renaming all 600 call sites now would be
 * churn on code that is about to be replaced — and a half-finished rename is
 * two vocabularies with no rule for which to use. Each screen drops
 * `useColors()` for `usePalette()` as it is redesigned; when the last one has,
 * this function and `ThemeColors` go with it.
 *
 * It is **derived, never a second set of literals**, so the two cannot drift,
 * and it takes the palette as an argument rather than closing over a module
 * constant — which is what makes every one of those screens theme-aware for
 * free. What it cannot fix is a screen with a *hardcoded* `#FFFFFF`; those read
 * wrong until the redesign reaches them.
 *
 * ── Three mappings that are not 1:1 ─────────────────────────────────────────
 *  · `fgMuted` → `soft` and `fgSubtle` → `muted`. Since the palette moved to
 *    DESIGN.md's three ink steps these are the **same value**; the legacy
 *    vocabulary's four-step ramp no longer exists to map onto.
 *
 *  · `bgElev` → `paper` (Tier 2) and `bgSunken` → `paperTile` (Tier 1). Both
 *    are translucent now, so a legacy screen that stacked a card on a card gets
 *    a doubled wash rather than a flat panel. That is visible, not broken, and
 *    resolves when the screen is redesigned onto `Glass`.
 *
 *  · `success` / `warning` are **semantically wrong at their call sites and are
 *    not fixed here.** Both are used for SRS rank labels — `mastered` and
 *    `learned` both take `success`, `met` takes `warning` — i.e. the four-rank
 *    ladder approximated with two colours. The real ladder is `RANK_COLORS` in
 *    `features/sky/map/lib/palette.ts`, which this file must not copy (see the
 *    header). They map to `gold` / `warn` so those ~18 sites keep reading as
 *    "high rank / mid rank" until each screen switches to the ladder.
 */
export function legacyColors(p: Palette): ThemeColors {
  return {
    bg: p.bg,
    bgElev: p.paper,
    bgSunken: p.paperTile,

    fg: p.ink,
    fgMuted: p.soft,
    fgSubtle: p.muted,

    border: p.bdB,
    borderStrong: p.bdA,

    accent: p.accent,
    accentSoft: p.tintB,
    /** "Ink that sits on a filled or selected surface" — the primary button's
     *  label, a selected chip, the avatar glyph. */
    accentFg: p.btnInk,

    highlight: p.accent,

    success: p.gold,
    warning: p.warn,
    error: p.danger,

    backdrop: p.scrim,
    shadow: 'rgba(0, 0, 0, 0.35)',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Font stacks
// ─────────────────────────────────────────────────────────────────────────────
//
// The app's faces are **Switzer** (Latin UI, and the mono role) + **Noto Sans
// JP** (Japanese) + **Lora** (reader body). The redesign brief (§2) keeps all
// three: the handoff's Sora / Zen Kaku Gothic New are **not** adopted, and what
// is taken from it is the *sizes, line-heights and tracking* — see `type` below.
//
// **Neither UI family ships a 600 cut.** DESIGN.md asks for 600 in nine roles;
// the brief's rule resolves every one of them: **600 → 700 at 15px and above,
// 600 → 500 below 15px.** Applied once, in `type`, so no screen has to
// remember it.
//
// **Weight is selected by family, not by `fontWeight`.** Noto's cuts are
// registered as separate families, and so are Switzer's, so `fontWeight: '700'`
// on a family that is already the Regular cut gets *synthesised* — a smeared
// fake bold. Every `type` role therefore names its cut in `fontFamily`, and
// carries `fontWeight` only so the platform fallback (if `SWITZER_AVAILABLE`
// ever flips false) still renders at roughly the right weight.

/** Latin UI face. Three cuts, matching the web's 400/500/700. */
const SWITZER = {
  regular: 'Switzer-Regular',
  medium: 'Switzer-Medium',
  bold: 'Switzer-Bold',
} as const;

/** Japanese face, from `@expo-google-fonts/noto-sans-jp` — the export names are
 *  also the registered family names, so the cuts are separate families rather
 *  than weights of one. `fontWeight` does nothing to these; pick the family. */
const NOTO_JP = {
  regular: 'NotoSansJP_400Regular',
  medium: 'NotoSansJP_500Medium',
  bold: 'NotoSansJP_700Bold',
} as const;

const SYSTEM_SANS = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
}) as string;

/** Resolve a Switzer cut, falling back to the platform sans as one unit — so a
 *  missing font never leaves a dangling family name on a text node. */
const ui = (cut: keyof typeof SWITZER) => (SWITZER_AVAILABLE ? SWITZER[cut] : SYSTEM_SANS);

export type ThemeFonts = {
  ui: string;
  display: string;
  displayBold: string;
  reader: string;
  readerItalic: string;
  jp: string;
  jpSans: string;
  /** Monospace *role* — caps + tabular metadata. Not an actual monospaced face:
   *  the web resolves `--face-mono` to Switzer for exactly this. */
  mono: string;
};

const DEFAULT_FONTS: ThemeFonts = {
  ui: ui('regular'),
  display: ui('bold'),
  displayBold: ui('bold'),
  /** The reader's body text — Lora stays. It is a *reading* face, chosen for
   *  long-form prose, and is not one of the UI roles the rule above covers. */
  reader: 'Lora_400Regular',
  readerItalic: 'Lora_400Regular_Italic',
  jp: NOTO_JP.regular,
  jpSans: NOTO_JP.regular,
  mono: ui('medium'),
};

/** The registered family names, for call sites that need a specific cut — the
 *  Japanese ones especially, since Noto's weights are separate families. */
export const FONT_FAMILIES = { switzer: SWITZER, notoJp: NOTO_JP } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Type roles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One typographic role, ready to spread into a `Text` style.
 *
 * `letterSpacing` is in **points**, not ems — RN has no em unit — so DESIGN.md's
 * tracking is multiplied through by the role's own size at definition time.
 */
export type TypeRole = {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '500' | '700';
  lineHeight: number;
  letterSpacing?: number;
};

/**
 * **DESIGN.md's type scale, with our faces.** A redesigned screen spreads a
 * role — `style={[styles.title, type.headlineMd]}` — and stops picking
 * `fontSize.*` and `fontFamily.*` by hand.
 *
 * Roles whose content is Japanese (`displayKanji`, `titleKanji`,
 * `titleReading`) take Noto; the rest take Switzer. The 600 rule is already
 * applied — no role below carries a weight our faces cannot draw.
 */
export const type = {
  /** 46px JP — the study card's headword at full size. */
  displayKanji: {
    fontFamily: NOTO_JP.medium,
    fontSize: 46,
    fontWeight: '500',
    lineHeight: 52,
    letterSpacing: 0.92,
  },
  /** 38px JP — the same headword on a phone, and the sky inspector's. */
  displayKanjiMobile: {
    fontFamily: NOTO_JP.medium,
    fontSize: 38,
    fontWeight: '500',
    lineHeight: 44,
    letterSpacing: 0.76,
  },
  /** 26px — a **root screen's** own title (`Library`).
   *
   *  [from the compositions] DESIGN.md's largest UI role is `headline-lg` at
   *  22px, but every root screen in the handoff sets its title larger and
   *  heavier than that — Library at 26/800, Dictionary at 30/800 — and at 22px
   *  a screen title reads as a section heading. 800 resolves to 700, our
   *  heaviest cut. A data point for the owner: the two compositions disagree
   *  on the size, and this role takes Library's. */
  screenTitle: {
    fontFamily: ui('bold'),
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.26,
  },
  /** 22px — a pushed screen's own title, a sheet's title. 600 → 700. */
  headlineLg: {
    fontFamily: ui('bold'),
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.22,
  },
  /** 18px — a card's title (`48 Cards Due`). 600 → 700. */
  headlineMd: {
    fontFamily: ui('bold'),
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  /** 24px JP — a dictionary result's headword, a book title in a row. */
  titleKanji: {
    fontFamily: NOTO_JP.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  /** 16px JP — the kana reading under a headword. */
  titleReading: {
    fontFamily: NOTO_JP.regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  /** 18px — an entry's meaning, set to read rather than to label. */
  titleMeaning: {
    fontFamily: ui('regular'),
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
  },
  /** 15px — the `Header` primitive's centred title. */
  headerTitle: {
    fontFamily: ui('medium'),
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  bodyMd: {
    fontFamily: ui('regular'),
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: ui('regular'),
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
  /** 14px — every button label. 600 → **500**, because 14 is below the 15px
   *  line in the brief's rule; 700 at this size reads as a shout. */
  labelButton: {
    fontFamily: ui('medium'),
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  /** 11px — the interval under an SRS grade (`1m · 10m · 1d · 4d`). */
  labelInterval: {
    fontFamily: ui('regular'),
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  },
  /** 10px uppercase, tracked 0.16em — section and card eyebrows. 600 → 500. */
  eyebrow: {
    fontFamily: ui('medium'),
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
    letterSpacing: 1.6,
  },
  caption: {
    fontFamily: ui('regular'),
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  /** 11px tracked 0.04em — machine metadata: counts, intervals, `340 stars ·
   *  28 due`. Always in `muted` or `faint`; uppercase when it labels a
   *  section. A *role*, not a face — see `ThemeFonts.mono`. */
  monoMeta: {
    fontFamily: ui('medium'),
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.44,
  },
} as const satisfies Record<string, TypeRole>;

// ─────────────────────────────────────────────────────────────────────────────
// Geometry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Corner radii, named by role. DESIGN.md's shape rule is that **controls are
 * 12px rectangles** — buttons, inputs, filter chips, list rows, menu rows, stat
 * tiles — and that circles are reserved for icon buttons, avatars, deck nodes
 * and stars. There are no 999px pills on controls any more.
 *
 * The legacy names are kept as aliases so ~25 unmigrated screens keep
 * compiling: `sm` → `chip`, `md` → `control`, `lg` → `card`. The old `xl: 20`
 * is **gone** — it had two call sites and neither meant a distinct step.
 */
export const radius = {
  /** JLPT / POS / state tags, count badges inside a CTA. */
  chip: 6,
  /** Every button, input, search field, filter chip, list row, stat tile. */
  control: 12,
  /** Cards and popover menus. */
  card: 16,
  /** Bottom sheets (top corners) and full modals. */
  sheet: 28,
  /** The study flashcard, and nothing else. */
  studyCard: 36,
  /** Kept **only** for the dock and progress tracks, per the brief. */
  pill: 999,

  /** @deprecated alias of `chip` — for screens the redesign has not reached. */
  sm: 6,
  /** @deprecated alias of `control`. */
  md: 12,
  /** @deprecated alias of `card`. */
  lg: 16,
} as const;

/**
 * The spacing scale: **4 / 8 / 12 / 16 / 20 / 36, and nothing between.**
 * Retuned in place to DESIGN.md — `xl` moved 24 → 20 and `xxl` 32 → 36, so
 * every existing call site shifts a few points. That is what a token is for.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 36,

  /* ── Screen frame ─────────────────────────────────────────────────────────
     The safe padding DESIGN.md specifies. `screenBottom` is the gap above the
     home indicator and is **not** the dock clearance — that is
     `useDockClearance()`, which no constant can replace. */
  screenX: 20,
  screenTop: 16,
  screenBottom: 12,

  /** Padding inside a Tier 2 card. */
  cardPad: 16,
  /** The gap between stacked cards. */
  stackGap: 14,
} as const;

/**
 * @deprecated The old size ramp. Redesigned screens spread a `type` role
 * instead; this stays for the screens that have not been rewritten yet and
 * retires with the last of them.
 */
export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  display: 32,
  hero: 42,
} as const;

/**
 * Static font lookup. Fonts do not vary per theme, so this equals what the
 * hook returns — kept because `StyleSheet.create` blocks can't call hooks.
 */
export const fontFamily = DEFAULT_FONTS;

// ─────────────────────────────────────────────────────────────────────────────
// Shape recipes
// ─────────────────────────────────────────────────────────────────────────────

export type SurfaceShape = {
  borderColor: string;
  borderWidth: number;
  radius: number;
  /** Drop-shadow recipe (RN). Set opacity 0 to disable. */
  shadowOffset: { width: number; height: number };
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  /** Android elevation; 0 keeps the look flat. */
  elevation: number;
};

export type ChipShape = {
  bg: string;
  fg: string;
  borderColor: string;
  borderWidth: number;
  radius: number;
  paddingV: number;
  paddingH: number;
  fontSize: number;
  letterSpacing: number;
  textTransform: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  /** No '600' — neither Switzer nor Noto Sans JP ships that cut, so it would
   *  be synthesised. Narrowed here so a shape recipe cannot ask for it. */
  fontWeight: '400' | '500' | '700';
};

export type ButtonShape = {
  borderColor: string;
  borderWidth: number;
  radius: number;
  shadowOffset: { width: number; height: number };
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  letterSpacing: number;
  textTransform: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
};

export type ThemeShape = {
  /** Default surface for cards, sheets, popovers. */
  surface: SurfaceShape;
  /** Inline tag / chip. */
  chip: ChipShape;
  /** Action button face. */
  button: ButtonShape;
  /** Section label colour + tracking + weight. */
  sectionLabel: { color: string; letterSpacing: number; fontWeight: '400' | '500' | '700' };
};

export type ThemeMeta = {
  /** The brand glyph — `BrandGlyph` draws it. */
  glyph: string;
  /** Drives status-bar and nav-bar ink. `app/_layout.tsx` turns it into the
   *  status-bar ink, so getting it wrong paints white text on a white page. */
  isDark: boolean;
};

export type Theme = {
  meta: ThemeMeta;
  colors: ThemeColors;
  fonts: ThemeFonts;
  shape: ThemeShape;
};

/**
 * The Tier 2 card surface, as a recipe.
 *
 * **It has a shadow again.** DESIGN.md gives every glass tier
 * `0 8px 32px rgba(0,0,0,0.35)`, and on a translucent pane that shadow is what
 * separates it from the canvas — the old flat baseline could lean on an opaque
 * fill and a solid border instead, and this one cannot.
 */
function glassSurface(p: Palette): SurfaceShape {
  return {
    borderColor: p.glassBorder,
    borderWidth: 1,
    radius: radius.card,
    shadowOffset: { width: 0, height: 8 },
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 6,
  };
}

/** A 6px tag — JLPT, part of speech, state. Not the 32px filter chip, which is
 *  a control and takes `radius.control`. */
function tagChip(p: Palette): ChipShape {
  return {
    bg: p.glassSubtle,
    fg: p.muted,
    borderColor: p.glassBorder,
    borderWidth: 1,
    radius: radius.chip,
    paddingV: 2,
    paddingH: 6,
    fontSize: 10,
    letterSpacing: 0.2,
    textTransform: 'none',
    fontWeight: '700',
  };
}

function controlButton(p: Palette): ButtonShape {
  return {
    borderColor: p.glassBorder,
    borderWidth: 0,
    radius: radius.control,
    shadowOffset: { width: 0, height: 8 },
    shadowColor: p.glowPrimary,
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    letterSpacing: 0,
    textTransform: 'none',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The theme
// ─────────────────────────────────────────────────────────────────────────────

/** `仰` — the brand glyph, from 仰ぎ見る ("to look up at"). */
const GLYPH = '仰';

/**
 * Assemble a full `Theme` from one palette column.
 *
 * Shape is derived from the palette rather than written out, so re-tinting the
 * app stays a palette edit. `isDark` is derived too — it is the one place the
 * polarity is stated.
 */
function buildTheme(p: Palette, isDark: boolean): Theme {
  return {
    meta: { glyph: GLYPH, isDark },
    colors: legacyColors(p),
    fonts: DEFAULT_FONTS,
    shape: {
      surface: glassSurface(p),
      chip: tagChip(p),
      button: controlButton(p),
      sectionLabel: { color: p.faint, letterSpacing: 1.6, fontWeight: '500' },
    },
  };
}

/**
 * Both themes, built once at module load.
 *
 * Built eagerly rather than per-render so `ThemeContext` can hand out a stable
 * object identity — a fresh `Theme` on every render would re-render every
 * `useTheme()` consumer in the app on any state change at all.
 */
export const THEMES: Record<ThemeName, Theme> = {
  day: buildTheme(PALETTES.day, false),
  night: buildTheme(PALETTES.night, true),
};

/**
 * **Deprecated — the Night theme as a static value**, the counterpart to the
 * `palette` alias above and there for the same reason. Read `useTheme()`.
 */
export const theme: Theme = THEMES.night;
