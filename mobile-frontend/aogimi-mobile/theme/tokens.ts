// ═══════════════════════════════════════════════════════════════════════════
// THE PALETTE — Day ("Ink on paper") + Night ("Midnight")
// ═══════════════════════════════════════════════════════════════════════════
//
// Two columns, one set of keys. `PALETTES.day` / `PALETTES.night` are the
// whole of it, and `ThemeContext` picks one per render. A key present in one
// column and missing from the other is a **compile error**, which is the point
// of the `Palette` type — nothing else forces the columns to agree. Role names
// match the web's tokens, so a role stays greppable across web and mobile.
//
// ── The surface contract (read this before recolouring) ────────────────────
// The rule is about **role**, not lightness — the two columns order themselves
// differently (Day is `paper` > `bg` > `paperTile`, Night is `paper` >
// `paperTile` > `bg`):
//
//   · `paper` is the RAISED CARD. It must separate from `bg`, and in both
//     columns it is the lightest of the three — a card sits *above* the
//     canvas.
//   · `paperTile` is an INSET WITHIN A CARD — a chip, a well, a badge. It must
//     contrast against `paper`, **not** against `bg`. Checking it against the
//     canvas is the mistake this paragraph exists to prevent.
//   · `bg` is the canvas and nothing sits directly on it but cards and ink.
//   · `ink` → `soft` → `muted` → `faint` is a monotonic ramp, most-contrast
//     first; `faint` must stay readable on `paper`.
//   · Anything named `*Ink` is the ink that sits ON the same-named fill, so the
//     pair contrasts with each other rather than with the canvas.
//   · Semantic hues (`accent` `danger` `warn` `gold`) double as *text*, so each
//     column's value has to read against that column's `paper`.
//
// ── Alpha values ────────────────────────────────────────────────────────────
// `tintA`/`tintB`, `bdA`/`bdB` and the `*Bg`/`*Bd` washes are alpha. A single
// shared set of alphas tuned against a lit canvas would disappear against a
// dark one; with two columns each carries its own, so that failure mode is
// gone. `paperBd` stays **opaque** in both: a hairline on a filled card is the
// one edge that has to survive whatever is behind it.
//
// ── What is deliberately NOT here ──────────────────────────────────────────
//   · **The mastery ladder.** Rank colours live in `features/sky/map/lib/
//     palette.ts` (`RANK_COLORS` / `SKY_PALETTES`) and are the single copy —
//     `verify:sky` asserts that module is bit-identical to the web's. Do not
//     re-declare the four hexes here.
//   · **The dock's material.** Mobile uses the web's glass, and
//     `features/app-shell/Dock.tsx` records why. So there is no `dock*` group.
//   · **Per-book spine colours.** `cover1..4` below is the whole of it: four
//     tints keyed off the stored `cover_color`.
//
// ── The sky stays night in both columns ────────────────────────────────────
// `sky1..3` and `deckSky` are dark in Day too, because stars are drawn on them.
// Chrome floating over that sky therefore cannot take its fills from this file
// — see `features/sky/stage/lib/nightChrome.ts`.

import { Platform } from 'react-native';
import { SWITZER_AVAILABLE } from './switzer';

/**
 * The colour contract. Both columns implement it exactly; `Palette` is derived
 * from Day so adding a key there forces Night to follow.
 *
 * Mapped over `typeof DAY` rather than aliasing it, so the **keys** are pinned
 * while the **values** widen to `string` — a straight alias would make Day's
 * literal hexes the type and reject every Night value as "not assignable to
 * '#f3f2ef'".
 */
export type Palette = { readonly [K in keyof typeof DAY]: string };

/**
 * **Day — "Ink on paper."** Warm off-white canvas, white cards above it,
 * vermillion accent, black filled buttons.
 */
const DAY = {
  /** Page canvas. Warm off-white — cards are the white thing, not this. */
  bg: '#f3f2ef',

  /* ── Ink ramp — four steps, most-contrast first ────────────────────────────
     `faint` is the floor and must stay readable on `paper`. */
  ink: '#141414',
  soft: '#4a4a48',
  muted: '#8b8a86',
  faint: '#b0afa9',

  /* ── Filled primary action ─────────────────────────────────────────────────
     Near-black face, white ink. Note this is one of the few tokens that does
     NOT keep its polarity in Night, where the primary action is gold. */
  btn: '#141414',
  btnInk: '#ffffff',

  /* ── Accent — the brand vermillion ─────────────────────────────────────────
     Used for the 仰 tile, the search glyph, emphasis ink. `accentInk` is a
     cream, the ink drawn on the brand tile — not white, which would be flat
     against the vermillion. */
  accent: '#c2452c',
  accentInk: '#f6ead0',

  /* ── Selection ─────────────────────────────────────────────────────────────
     "This is the selected one" — a separate role from `accent`, which is
     emphasis. It currently tracks the accent; kept as its own token so the
     two can diverge. */
  active: '#c2452c',
  activeInk: '#f6ead0',

  /* ── Progress ──────────────────────────────────────────────────────────────
     A track visible while empty, and a fill unmistakably full. */
  track: '#e8e6e0',
  fill: '#141414',

  avatar: '#141414',
  avatarInk: '#ffffff',

  /* ── Destructive ───────────────────────────────────────────────────────────
     `danger` doubles as text; `dangerBg`/`dangerBd` are the wash and edge it
     sits on. Alpha is fine here — see the header. */
  danger: '#c2452c',
  dangerBg: 'rgba(194, 69, 44, 0.08)',
  dangerBd: 'rgba(194, 69, 44, 0.28)',

  /* ── Caution ───────────────────────────────────────────────────────────────
     A dark amber, because this value has to work as text on `paper`. */
  warn: '#a87d22',
  warnBg: 'rgba(168, 129, 31, 0.12)',
  warnBd: 'rgba(181, 134, 46, 0.30)',

  /** Mastery / highlight ink. Dark amber in Day for the same reason as `warn`;
   *  Night can afford the bright one. Not the SRS ladder's top rank, which is
   *  the sky's business (see the header). */
  gold: '#a8811f',

  /* ── Tints + border weights ────────────────────────────────────────────────
     Neutral washes that layer over covers and images. `bdA` is the strong edge
     (a panel against the canvas), `bdB` the weak one (a divider inside a card). */
  tintA: 'rgba(20, 20, 20, 0.10)',
  tintB: 'rgba(20, 20, 20, 0.04)',
  bdA: 'rgba(20, 20, 20, 0.22)',
  bdB: 'rgba(20, 20, 20, 0.09)',

  /* ── Surface ladder — see the header's role contract ───────────────────────
     `paper` is the raised card, `paperTile` the inset inside it. */
  /** Cards, rows, sheets. The raised step, above the canvas. */
  paper: '#ffffff',
  /** Chips, wells, badges — an inset *within* a card, judged against `paper`. */
  paperTile: '#f7f6f3',
  /** The hairline edge of a filled surface. Opaque in both columns. */
  paperBd: '#e8e6e0',

  /** Edge that appears on a card only once something needs to be seen. */
  cardBorderOn: 'rgba(20, 20, 20, 0.22)',

  /** Sheet / popover backdrop. A dark scrim in both columns — its job is to
   *  push the page back, which reads the same whichever way the palette runs. */
  scrim: 'rgba(0, 0, 0, 0.45)',

  /* ── Book + deck covers ────────────────────────────────────────────────────
     Four unmistakably different tints, keyed off the stored `cover_color`
     rather than painted from it (that hex is shared data the web renders too —
     see `bookPush`). Only `covtrack` is alpha, since it sits ON the cover. */
  cover1: '#21385c',
  cover1Ink: '#e7dcc2',
  cover2: '#6b2a5e',
  cover2Ink: '#f6e2ef',
  cover3: '#4e8088',
  cover3Ink: '#e9f6f1',
  cover4: '#7a5a2e',
  cover4Ink: '#f4e9d4',
  covtrack: 'rgba(255, 255, 255, 0.16)',

  /* ── Night sky, top → base ─────────────────────────────────────────────────
     **Dark in Day as well** — stars need night. Three gradient stops; `sky3`
     is the outermost so it stays the darkest — it is the fill behind
     overscroll. */
  sky1: '#1c2c47',
  sky2: '#16233c',
  sky3: '#0d1526',

  /** The deck card's own sky panel — the card's frame, not the star map. */
  deckSky: '#1c2c47',
} as const;

/**
 * **Night — "Midnight."** Near-black canvas, raised charcoal cards, warm gold
 * primary action.
 *
 * Two reversals worth knowing before reading values off this column: the
 * primary action is **gold with dark ink** (Day's is black with white ink), and
 * `paperTile` sits *above* `bg` rather than below it. Both are correct — see
 * the header's role contract.
 */
const NIGHT: Palette = {
  bg: '#0b0b0d',

  ink: '#f2f1ee',
  soft: '#c9c8c4',
  muted: '#9b9aa2',
  faint: '#7a7982',

  /** Gold, not black — a near-black button would vanish into a near-black
   *  canvas. `btnInk` flips with it. */
  btn: '#ffe085',
  btnInk: '#141414',

  /** The vermillion lifted for a dark ground; `accentInk` stays the cream so
   *  the brand tile is one mark in both columns. */
  accent: '#e0715a',
  accentInk: '#f6ead0',

  active: '#e0715a',
  activeInk: '#f6ead0',

  track: '#1f2024',
  fill: '#f2f1ee',

  avatar: '#f2f1ee',
  avatarInk: '#141414',

  danger: '#e0715a',
  dangerBg: 'rgba(224, 113, 90, 0.14)',
  dangerBd: 'rgba(224, 113, 90, 0.34)',

  warn: '#e0b85a',
  warnBg: 'rgba(224, 184, 90, 0.14)',
  warnBd: 'rgba(224, 184, 90, 0.34)',

  /** The bright gold Day cannot use, because here it sits on charcoal. */
  gold: '#ffe085',

  tintA: 'rgba(255, 255, 255, 0.14)',
  tintB: 'rgba(255, 255, 255, 0.06)',
  bdA: 'rgba(255, 255, 255, 0.26)',
  bdB: 'rgba(255, 255, 255, 0.12)',

  /** Raised above the canvas, as in Day — the direction is what is shared, not
   *  the lightness. */
  paper: '#31333a',
  /** Inset within a card. Darker than `paper` here and lighter than it in Day;
   *  what matters is that it separates from `paper`, not where it lands
   *  relative to `bg`. */
  paperTile: '#1f2024',
  paperBd: '#3f424a',

  cardBorderOn: 'rgba(255, 255, 255, 0.26)',

  scrim: 'rgba(0, 0, 0, 0.45)',

  /** Cover fills are shared with Day: they are keyed off backend data and are
   *  already dark saturated grounds with pale ink, which reads in both. */
  cover1: '#21385c',
  cover1Ink: '#e7dcc2',
  cover2: '#6b2a5e',
  cover2Ink: '#f6e2ef',
  cover3: '#4e8088',
  cover3Ink: '#e9f6f1',
  cover4: '#7a5a2e',
  cover4Ink: '#f4e9d4',
  covtrack: 'rgba(255, 255, 255, 0.16)',

  /** A step darker than Day's sky, so the panel still separates from a
   *  near-black canvas instead of merging into it. */
  sky1: '#16223c',
  sky2: '#0d1526',
  sky3: '#05070f',

  deckSky: '#16223c',
};

/** The two columns. `ThemeContext` resolves one; nothing else should index this. */
export const PALETTES = { day: DAY, night: NIGHT } as const;

export type ThemeName = keyof typeof PALETTES;

/**
 * **Deprecated — the Day column as a static value.**
 *
 * Colour is per-theme now, so the correct way to read it is `usePalette()`.
 * This alias exists only because ~21 modules read `palette.*` inside a
 * module-scope `StyleSheet.create`, which cannot call a hook; rewriting all of
 * them at once would be churn on screens slated for redesign. Those screens
 * are therefore **Day-locked**: they will look wrong in Night until each is
 * migrated, as with `useColors()` below.
 *
 * Do not add call sites. A screen being redesigned drops this for `usePalette()`
 * and builds its styles inside the component.
 */
export const palette = DAY;

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
 * **Why a bridge instead of a rename.** ~61 components do `const c = useColors()`
 * and read these keys ~600 times. Those screens are being rewritten one at a
 * time, so renaming all 600 call sites now would be churn on code that is about
 * to be replaced — and a half-finished rename is two vocabularies with no rule
 * for which to use. Each screen drops `useColors()` for `usePalette()` as it is
 * redesigned; when the last one has, this function and `ThemeColors` go with it.
 *
 * It is **derived, never a second set of literals**, so the two cannot drift.
 *
 * **It takes the palette as an argument** rather than closing over a module
 * constant, which is what makes every one of those screens theme-aware for
 * free: `useColors()` calls this with whichever column is live. (What it cannot
 * fix is a screen with a *hardcoded* `#FFFFFF` — those will read wrong in Night
 * until the redesign reaches them.)
 *
 * ── Three mappings that are not 1:1 ─────────────────────────────────────────
 * The legacy vocabulary has three ink steps against the palette's four, and
 * folds two distinct roles into `accentFg`. Recorded here rather than
 * discovered later:
 *
 *  · `fgMuted` → `soft` and `fgSubtle` → `muted`. Three steps onto the top
 *    three of four; `faint` has no legacy name and is only reachable via
 *    `usePalette()`.
 *
 *  · `accent` → `accent`. Its 15 call sites are all emphasis (the results
 *    kicker, meaning numbers, a chip label, the common-word dot), which is what
 *    `accent` means. A site that wanted "filled button" got `accentFg` and is
 *    handled below.
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
    /** Card, row and sheet fills. */
    bgElev: p.paper,
    /** Badges, tracks and bars. `paperTile` and `track` are separate roles (a
     *  track has to be visible while empty, a badge does not), so a call site
     *  that means "progress track" should move to `track`. */
    bgSunken: p.paperTile,

    fg: p.ink,
    fgMuted: p.soft,
    fgSubtle: p.muted,

    border: p.bdB,
    borderStrong: p.bdA,

    accent: p.accent,
    accentSoft: p.tintB,
    /** "Ink that sits on a filled or selected surface" — the primary button's
     *  label, a selected chip, the avatar glyph. `BrandGlyph` was the one site
     *  that meant ink-on-*accent* and reads `accentInk` directly. */
    accentFg: p.btnInk,

    highlight: p.gold,

    success: p.gold,
    warning: p.warn,
    error: p.danger,

    backdrop: p.scrim,
    shadow: 'rgba(0, 0, 0, 0.45)',
  };
}

/** What's left of the old per-palette metadata: the two fields something
 *  actually reads. `name` and `label` existed only for the theme picker. */
export type ThemeMeta = {
  /** The brand glyph — `BrandGlyph` draws it. */
  glyph: string;
  /** Drives status-bar and nav-bar ink. **Derived from the active theme now** —
   *  it was a constant while there was one palette. `app/_layout.tsx` turns it
   *  into the status-bar ink, so getting it wrong paints white text on a white
   *  page (or the reverse). */
  isDark: boolean;
};

export type ThemeFonts = {
  ui: string;
  display: string;
  displayBold: string;
  reader: string;
  readerItalic: string;
  jp: string;
  jpSans: string;
  /** Monospace face — caps + tabular metadata. Themes may override. */
  mono: string;
};

export type SurfaceShape = {
  borderColor: string;
  borderWidth: number;
  radius: number;
  /** Hard offset shadow recipe (RN). Set offset {0,0} + opacity 0 to disable. */
  shadowOffset: { width: number; height: number };
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  /** Android elevation; 0 keeps the look hard-edged. */
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
  /** Inline tag / chip pill. */
  chip: ChipShape;
  /** Action button face. */
  button: ButtonShape;
  /** Section label color + tracking + weight. */
  sectionLabel: { color: string; letterSpacing: number; fontWeight: '400' | '500' | '700' };
};

export type Theme = {
  meta: ThemeMeta;
  colors: ThemeColors;
  fonts: ThemeFonts;
  shape: ThemeShape;
};

// ─────────────────────────────────────────────────────────────────────────────
// Font stacks
// ─────────────────────────────────────────────────────────────────────────────
//
// The app's faces are **Switzer** (Latin UI, and the mono role) + **Noto Sans
// JP** (Japanese), matching the web's `--face-ui` / `--face-mono` /
// `--face-jp`. Families are substituted here, at the token layer, so no call
// site ever names a family.
//
// **Neither family ships a 600 cut** — the same trap the web documents. Use
// '500' or '700'; a `fontWeight: '600'` gets synthesised and looks wrong.
//
// Switzer is registered in `theme/switzer.ts` (the web's `.woff2` set cannot
// be reused — React Native has no woff2 support, hence the parallel `.otf`
// set). If a cut is ever removed, `SWITZER_AVAILABLE` flips false and the two
// Latin roles fall back to the platform sans rather than dangling a font
// reference.

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

const DEFAULT_FONTS: ThemeFonts = {
  ui: SWITZER_AVAILABLE ? SWITZER.regular : SYSTEM_SANS,
  display: SWITZER_AVAILABLE ? SWITZER.bold : SYSTEM_SANS,
  displayBold: SWITZER_AVAILABLE ? SWITZER.bold : SYSTEM_SANS,
  /** The reader's body text — Lora stays. It is a *reading* face, chosen for
   *  long-form prose, and is not one of the UI roles the rule above covers. */
  reader: 'Lora_400Regular',
  readerItalic: 'Lora_400Regular_Italic',
  jp: NOTO_JP.regular,
  jpSans: NOTO_JP.regular,
  /** Switzer doubles as the mono role, as on the web. It is **not** monospaced:
   *  the role means "caps, tracked-out micro-labels and tabular metadata", and
   *  the web resolves `--face-mono` to Switzer for exactly that. */
  mono: SWITZER_AVAILABLE ? SWITZER.medium : SYSTEM_SANS,
};

/** The registered family names, for call sites that need a specific cut — the
 *  Japanese ones especially, since Noto's weights are separate families. */
export const FONT_FAMILIES = { switzer: SWITZER, notoJp: NOTO_JP } as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shape recipes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The filled card surface.
 *
 * **No shadow.** Card separation comes from the opaque `paper` fill and the
 * solid border, which is all a flat baseline needs. The shadow fields stay on
 * `SurfaceShape` (zeroed) rather than being deleted, so a design that wants
 * elevation sets four numbers here instead of re-threading the type through
 * every consumer.
 */
function softSurface(colors: ThemeColors): SurfaceShape {
  return {
    borderColor: colors.border,
    borderWidth: 1,
    radius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  };
}

function softChip(colors: ThemeColors): ChipShape {
  return {
    bg: colors.bgSunken,
    fg: colors.fgMuted,
    borderColor: colors.border,
    // 1, not 0: a sunken chip sitting on the canvas has almost no fill contrast
    // to give, so the edge is what makes it a distinct object. Drop back to 0
    // once the redesign gives chips a fill that separates on its own.
    borderWidth: 1,
    radius: 999,
    paddingV: 4,
    paddingH: 10,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'none',
    fontWeight: '500',
  };
}

function softButton(colors: ThemeColors): ButtonShape {
  return {
    borderColor: colors.borderStrong,
    borderWidth: 0,
    radius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    letterSpacing: -0.1,
    textTransform: 'none',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The theme
// ─────────────────────────────────────────────────────────────────────────────

/** `仰` — the brand glyph, from 仰ぎ見る ("to look up"). */
const GLYPH = '仰';

/**
 * Assemble a full `Theme` from one palette column.
 *
 * Shape is derived from the colours rather than written out, so re-tinting the
 * app stays a palette edit. `isDark` is derived too — it is the one place the
 * polarity is stated, and `app/_layout.tsx` turns it into the status-bar ink,
 * so a stale constant here paints white status text on a white page.
 */
function buildTheme(p: Palette, isDark: boolean): Theme {
  const colors = legacyColors(p);
  return {
    meta: { glyph: GLYPH, isDark },
    colors,
    fonts: DEFAULT_FONTS,
    shape: {
      surface: softSurface(colors),
      chip: softChip(colors),
      button: softButton(colors),
      sectionLabel: { color: colors.fgMuted, letterSpacing: 1.5, fontWeight: '500' },
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
 * **Deprecated — the Day theme as a static value**, the counterpart to the
 * `palette` alias above and there for the same reason. Read `useTheme()`.
 */
export const theme: Theme = THEMES.day;

/**
 * Corner radii. Named by role rather than value: every `radius.lg` call site
 * means "the card radius", so re-valuing a step retunes the whole app in one
 * line.
 */
export const radius = {
  /** Book and deck spines. */
  sm: 6,
  /** Buttons. */
  md: 12,
  /** Cards, sheets, panels. */
  lg: 16,
  /** Chips and pills — full-round at the sizes they are used. */
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

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
