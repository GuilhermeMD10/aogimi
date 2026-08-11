// ═══════════════════════════════════════════════════════════════════════════
// RESET PALETTE — a legibility baseline, not a design (2026-08-10)
// ═══════════════════════════════════════════════════════════════════════════
//
// The previous palette (the web's "Midnight" column, ported token-for-token)
// was deliberately discarded: too many of its values sat within a few points of
// each other on a near-black canvas, so borders, sunken tiles and low-emphasis
// ink were effectively invisible on device. Rather than patch individual
// offenders, every value here was re-chosen from scratch against one rule:
//
//   **every token must be plainly distinguishable from the token it sits on.**
//
// So: a flat black canvas, a three-step opaque surface ladder, *solid* borders
// instead of low-alpha white, an ink ramp that keeps real distance between its
// four steps, and one obvious hue per semantic role (blue accent, red danger,
// amber caution, yellow highlight, four saturated covers).
//
// This is scaffolding. It is meant to be ugly-but-readable so the screen-by-
// screen redesign can judge *layout* without fighting the colour, and so a
// mis-tokened element shows up rather than blending in. Recolour freely — the
// contract below is what matters, not any particular hex.
//
// ── The contract to keep when recolouring ──────────────────────────────────
//   · `bg` < `paperTile` < `paper` in lightness, each step clearly apart.
//   · `bdA` / `bdB` / `paperBd` are opaque and visible unaided. They used to be
//     white at 12–26% alpha; that is what made hairline dividers vanish.
//   · `ink` → `soft` → `muted` → `faint` is a monotonic ramp; `faint` must
//     still be readable on `bg`.
//   · Anything named `*Ink` is the ink that sits *on* the same-named fill, so
//     the pair has to contrast with each other, not with the canvas.
//
// ── Key names are unchanged, on purpose ────────────────────────────────────
// Only the values were reset. The names still mirror the web's tokens
// (`--paper-tile` → `paperTile`) so a role stays greppable across both
// codebases, and the derived `ThemeColors` bridge at the bottom is untouched —
// which is why all ~63 `useColors()` screens pick this up with no edits.
//
// ── What is deliberately NOT here: the mastery ladder ───────────────────────
// Rank colours live in `features/sky/map/lib/palette.ts` (`RANK_COLORS` /
// `SKY_PALETTES`) and are the single copy — `verify:sky` asserts that module is
// bit-identical to the web's. Do not re-declare the four hexes here.

import { Platform } from 'react-native';

/**
 * The reset palette — the single source of colour for the app.
 *
 * Role names, not value names. See the file header for the contract each of
 * these has to satisfy; the specific values are a baseline to redesign from.
 */
export const palette = {
  /** Page canvas. Flat black so every surface above it reads as a step up. */
  bg: '#000000',

  /* ── Ink ramp — four steps, brightest first ─────────────────────────────────
     Wide, even gaps. `faint` is the floor and must stay readable on `bg`. */
  ink: '#ffffff',
  soft: '#c8c8c8',
  muted: '#9a9a9a',
  faint: '#787878',

  /* ── Filled primary action ─────────────────────────────────────────────────
     White face, black ink — maximum separation from every surface. */
  btn: '#ffffff',
  btnInk: '#000000',

  /* ── Accent ────────────────────────────────────────────────────────────────
     One obvious blue. Placeholder for the brand hue; used for emphasis ink,
     the brand tile, the search glyph, meaning numbers. */
  accent: '#3b82f6',
  accentInk: '#ffffff',

  /* ── Selection ─────────────────────────────────────────────────────────────
     "This is the selected one". Same blue as `accent` for now — the reset does
     not try to guess a second hue — but kept as its own token because the two
     roles are separate and will diverge. `activeInk` sits ON `active`. */
  active: '#3b82f6',
  activeInk: '#ffffff',

  /* ── Progress ──────────────────────────────────────────────────────────────
     A track that is visible while empty, and a fill that is unmistakably full. */
  track: '#3a3a3a',
  fill: '#ffffff',

  avatar: '#ffffff',
  avatarInk: '#000000',

  /* ── Destructive ───────────────────────────────────────────────────────────
     Opaque bg + border rather than 14%/34% alpha: the tinted-chip pattern was
     one of the invisible ones. */
  danger: '#ef4444',
  dangerBg: '#3a1414',
  dangerBd: '#ef4444',

  /* ── Caution ─────────────────────────────────────────────────────────────── */
  warn: '#f59e0b',
  warnBg: '#3a2a0a',
  warnBd: '#f59e0b',

  /** Highlight / reading progress on a book cover. Not the SRS ladder's top
   *  rank, which is the sky's business (see the header). */
  gold: '#facc15',

  /* ── Tints + border weights ────────────────────────────────────────────────
     Tints stay translucent — they layer over covers and images, where an opaque
     grey would blot out what is underneath. Borders are now **opaque**: these
     two were white at 0.12 / 0.26 and are the single biggest reason hairlines
     and card edges could not be seen. */
  tintA: 'rgba(255, 255, 255, 0.28)',
  tintB: 'rgba(255, 255, 255, 0.14)',
  bdA: '#8a8a8a',
  bdB: '#5a5a5a',

  /* ── Surface ladder ────────────────────────────────────────────────────────
     Three opaque steps: canvas (`bg`) → sunken (`paperTile`) → raised
     (`paper`). Named after the web's `--paper-*` group, but on mobile this is
     simply "the filled surface" — there is no transparent-card trio here. */
  /** Cards, rows, sheets. The raised step. */
  paper: '#2c2c2c',
  /** Badges, tracks, bars, wells. The sunken step. */
  paperTile: '#1a1a1a',
  /** The edge of a filled surface. Opaque and visible unaided. */
  paperBd: '#5a5a5a',

  /** Edge that appears on a card only once something needs to be seen. */
  cardBorderOn: '#8a8a8a',

  /** Sheet / popover backdrop. Dark enough that what is behind it stops
   *  competing with what is on top. */
  scrim: 'rgba(0, 0, 0, 0.78)',

  /* ── Book + deck covers ────────────────────────────────────────────────────
     Four saturated, unmistakably different hues, all carrying white ink. A
     cover is a printed object, so these do not adapt; only `covtrack` does,
     since it sits ON the cover. */
  cover1: '#1d4ed8',
  cover1Ink: '#ffffff',
  cover2: '#b91c1c',
  cover2Ink: '#ffffff',
  cover3: '#047857',
  cover3Ink: '#ffffff',
  cover4: '#6d28d9',
  cover4Ink: '#ffffff',
  covtrack: 'rgba(0, 0, 0, 0.40)',

  /* ── Night sky, top → base ─────────────────────────────────────────────────
     The sky page's background gradient, three stops. `sky3` is the outermost so
     it must stay the darkest — it is the fill behind overscroll. Kept blue
     rather than flattened to grey: this is the one surface whose *hue* is
     load-bearing, since stars are drawn on it. */
  sky1: '#1e2a4a',
  sky2: '#111a2e',
  sky3: '#060912',

  /** The deck card's own sky panel — the card's frame, not the star map. */
  deckSky: '#1e2a4a',
} as const;

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
 * The legacy key → `palette` mapping, in one place.
 *
 * **Why a bridge instead of a rename.** 71 components do `const c = useColors()`
 * and read these keys ~600 times. Phase 6 rewrites those screens against the
 * handoff one at a time, so renaming all 600 call sites now would be churn on
 * code that is about to be replaced — and a half-finished rename is two
 * vocabularies with no rule for which to use. Each screen drops `useColors()`
 * for `palette` as it is redesigned; when the last one has, this block and
 * `ThemeColors` go with it.
 *
 * It is **derived, never a second set of literals**, so the two cannot drift.
 *
 * ── Three mappings that are not 1:1 ─────────────────────────────────────────
 * The old palette had three ink steps against the web's four, and folded two
 * distinct web roles into `accentFg`. Recorded here rather than discovered later:
 *
 *  · `fgMuted` → `soft` and `fgSubtle` → `muted`. Three steps onto the top
 *    three of four; `faint` has no legacy name and is only reachable via
 *    `palette`.
 *
 *  · `accent` → `accent`. Its 15 call sites are all emphasis (the results
 *    kicker, meaning numbers, a chip label, the common-word dot), which is what
 *    `palette.accent` means. A site that wanted "filled button" got `accentFg`
 *    and is handled below.
 *
 *  · `success` / `warning` are **semantically wrong at their call sites and are
 *    not fixed here.** Both are used for SRS rank labels — `mastered` and
 *    `learned` both take `success`, `met` takes `warning` — i.e. the four-rank
 *    ladder approximated with two colours. The real ladder is `RANK_COLORS` in
 *    `features/sky/map/lib/palette.ts`, which this file must not copy (see the
 *    header). They map to `gold` / `warn` so those ~18 sites keep reading as
 *    "high rank / mid rank" until each screen switches to the ladder.
 */
const LEGACY: ThemeColors = {
  bg: palette.bg,
  /** Card, row and sheet fills. */
  bgElev: palette.paper,
  /** Badges, tracks and bars. `paperTile` and `track` used to be the same hex,
   *  so this one key covered both roles; the reset separated them (a track has
   *  to be visible while empty, a badge does not), so a call site that means
   *  "progress track" should now move to `palette.track`. */
  bgSunken: palette.paperTile,

  fg: palette.ink,
  fgMuted: palette.soft,
  fgSubtle: palette.muted,

  border: palette.bdB,
  borderStrong: palette.bdA,

  accent: palette.accent,
  accentSoft: palette.tintB,
  /** "Ink that sits on a filled or selected surface" — the primary button's
   *  label, a selected chip, the avatar glyph. All three are dark-on-pale in
   *  Midnight. `BrandGlyph` was the one site that meant ink-on-*vermilion* and
   *  now reads `palette.accentInk` directly. */
  accentFg: palette.btnInk,

  highlight: palette.gold,

  success: palette.gold,
  warning: palette.warn,
  error: palette.danger,

  backdrop: palette.scrim,
  shadow: 'rgba(0, 0, 0, 0.45)',
};

/** What's left of the old per-palette metadata: the two fields something
 *  actually reads. `name` and `label` existed only for the theme picker. */
export type ThemeMeta = {
  /** The brand glyph — `BrandGlyph` draws it. */
  glyph: string;
  /** Drives status-bar and nav-bar ink. A constant now, kept as a token so the
   *  call sites don't hardcode a polarity the design handoff may flip. */
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
  fontWeight: '400' | '500' | '600' | '700';
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
  sectionLabel: { color: string; letterSpacing: number; fontWeight: '400' | '500' | '600' | '700' };
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

const JP_STACK = Platform.select({
  ios: 'Hiragino Mincho ProN',
  android: 'NotoSerifJP-Regular',
  default: 'serif',
}) as string;

const JP_SANS_STACK = Platform.select({
  ios: 'Hiragino Sans',
  android: 'NotoSansJP-Regular',
  default: 'sans-serif',
}) as string;

const SYSTEM_UI = Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) as string;
const SYSTEM_MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

const DEFAULT_FONTS: ThemeFonts = {
  ui: SYSTEM_UI,
  display: 'Lora_600SemiBold',
  displayBold: 'Lora_700Bold',
  reader: 'Lora_400Regular',
  readerItalic: 'Lora_400Regular_Italic',
  jp: JP_STACK,
  jpSans: JP_SANS_STACK,
  mono: SYSTEM_MONO,
};

// ─────────────────────────────────────────────────────────────────────────────
// Shape recipes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The filled card surface.
 *
 * **No shadow.** Every drop shadow in the app was stripped in the 2026-08-10
 * strip-to-basics pass, this one included: card separation now comes from the
 * opaque `paper` fill and the solid border, which is all a flat baseline needs.
 * The fields stay on `SurfaceShape` (zeroed) rather than being deleted, so a
 * redesign that wants elevation back sets four numbers here instead of
 * re-threading the type through every consumer.
 *
 * Radius 16 is unchanged — radii are structure, not decoration.
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

/** `仰` — the brand glyph, from 仰ぎ見る ("to look up"). Replaces the
 *  placeholder `語`; the handoff draws it on the vermilion tile. */
const META: ThemeMeta = { glyph: '仰', isDark: true };

const COLORS: ThemeColors = LEGACY;

/** The one theme. Shape is derived from the colours rather than written out,
 *  so re-tinting the app stays a `COLORS` edit. */
export const theme: Theme = {
  meta: META,
  colors: COLORS,
  fonts: DEFAULT_FONTS,
  shape: {
    surface: softSurface(COLORS),
    chip: softChip(COLORS),
    button: softButton(COLORS),
    sectionLabel: { color: COLORS.fgMuted, letterSpacing: 1.5, fontWeight: '500' },
  },
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
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
 * Static font lookup. Identical to `useFonts()` now that there is one theme —
 * both are kept because the hook is the shape the rest of the app already
 * calls, and `StyleSheet.create` blocks can't call hooks.
 */
export const fontFamily = DEFAULT_FONTS;
