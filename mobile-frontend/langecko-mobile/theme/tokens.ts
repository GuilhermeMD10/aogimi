import { Platform } from 'react-native';

export type ThemeName = 'default' | 'kanagawa' | 'sakura' | 'hanami' | 'stamp';

export const THEME_NAMES: ThemeName[] = ['default', 'kanagawa', 'sakura', 'hanami', 'stamp'];

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

export type ThemeMeta = {
  name: ThemeName;
  label: string;
  glyph: string;
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

/** Stamp typography — Editorial Mincho pairing per the Stamp DS.
 *
 *  The DS calls for Shippori Mincho (display + JP) + Cormorant Garamond
 *  (Latin body) + DM Mono (caps metadata). Mobile ships with Lora + the
 *  system mincho already loaded, which is a credible fallback because:
 *   - System mincho on iOS/Android is the same family used by `fontFamily.jp`,
 *     and reads as a postage-era serif at the sizes Stamp uses.
 *   - Lora is a humanist book serif that pairs cleanly with mincho.
 *
 *  To upgrade to the exact DS pairing, install:
 *      @expo-google-fonts/shippori-mincho
 *      @expo-google-fonts/cormorant-garamond
 *      @expo-google-fonts/dm-mono
 *  …register the weights in `app/_layout.tsx`, and swap the values below
 *  to e.g. `'ShipporiMincho_700Bold'`. No call sites change. */
const STAMP_FONTS: ThemeFonts = {
  ui: 'Lora_400Regular',
  display: JP_STACK,
  displayBold: JP_STACK,
  reader: 'Lora_400Regular',
  readerItalic: 'Lora_400Regular_Italic',
  jp: JP_STACK,
  jpSans: JP_SANS_STACK,
  mono: SYSTEM_MONO,
};

// ─────────────────────────────────────────────────────────────────────────────
// Shape recipes
// ─────────────────────────────────────────────────────────────────────────────

/** Soft modern surface — used by every non-stamp theme. */
function softSurface(colors: ThemeColors): SurfaceShape {
  return {
    borderColor: colors.border,
    borderWidth: 1,
    radius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  };
}

function softChip(colors: ThemeColors): ChipShape {
  return {
    bg: colors.bgSunken,
    fg: colors.fgMuted,
    borderColor: colors.border,
    borderWidth: 0,
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

/** Stamp surface — 1.5px sumi border + hard 3px offset shadow + crisp 2px corners. */
function stampSurface(colors: ThemeColors): SurfaceShape {
  return {
    borderColor: colors.fg,
    borderWidth: 1.5,
    radius: 2,
    shadowOffset: { width: 3, height: 3 },
    shadowColor: colors.fg,
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  };
}

function stampChip(colors: ThemeColors): ChipShape {
  return {
    bg: colors.bg,
    fg: colors.fg,
    borderColor: colors.fg,
    borderWidth: 1.25,
    radius: 0,
    paddingV: 3,
    paddingH: 9,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    fontWeight: '500',
  };
}

function stampButton(colors: ThemeColors): ButtonShape {
  return {
    borderColor: colors.fg,
    borderWidth: 1,
    radius: 2,
    shadowOffset: { width: 2, height: 2 },
    shadowColor: colors.fg,
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
    letterSpacing: 0.6,
    textTransform: 'none',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Palettes — colors only. Shape + fonts are layered on by `buildTheme()` so the
// shape recipes can reference token values (and so a new theme is still only
// a new color block to add).
// ─────────────────────────────────────────────────────────────────────────────

type Palette = {
  meta: ThemeMeta;
  colors: ThemeColors;
  fonts?: Partial<ThemeFonts>;
  /** Override hook — return a partial shape spec that will be merged in. */
  shape?: (colors: ThemeColors) => Partial<ThemeShape>;
};

const PALETTES: Record<ThemeName, Palette> = {
  default: {
    meta: { name: 'default', label: 'Default', glyph: '語', isDark: false },
    colors: {
      bg: '#FAFAF9',
      bgElev: '#FFFFFF',
      bgSunken: '#F2F1EE',
      fg: '#1A1918',
      fgMuted: '#6B6966',
      fgSubtle: '#A8A5A0',
      border: 'rgba(26, 25, 24, 0.08)',
      borderStrong: 'rgba(26, 25, 24, 0.14)',
      accent: '#1A1918',
      accentSoft: 'rgba(26, 25, 24, 0.06)',
      accentFg: '#FFFFFF',
      highlight: '#F5E3A9',
      success: '#3B7A40',
      warning: '#B8862B',
      error: '#B84238',
      backdrop: 'rgba(26, 25, 24, 0.45)',
      shadow: 'rgba(26, 25, 24, 0.08)',
    },
  },
  kanagawa: {
    meta: { name: 'kanagawa', label: 'Wave of Kanagawa', glyph: '波', isDark: false },
    colors: {
      bg: '#EDE6D3',
      bgElev: '#F6F0DE',
      bgSunken: '#E0D7BE',
      fg: '#0F2340',
      fgMuted: '#4A5E80',
      fgSubtle: '#8494AC',
      border: 'rgba(15, 35, 64, 0.10)',
      borderStrong: 'rgba(15, 35, 64, 0.18)',
      accent: '#1E3D6B',
      accentSoft: '#C9D6E4',
      accentFg: '#FFFFFF',
      highlight: '#D4C999',
      success: '#3B7A40',
      warning: '#A8742A',
      error: '#A04040',
      backdrop: 'rgba(15, 35, 64, 0.42)',
      shadow: 'rgba(15, 35, 64, 0.10)',
    },
  },
  sakura: {
    meta: { name: 'sakura', label: 'Sakura', glyph: '桜', isDark: false },
    colors: {
      bg: '#FBF4F2',
      bgElev: '#FFFBFA',
      bgSunken: '#F3E7E5',
      fg: '#3E2A2F',
      fgMuted: '#7A5A5F',
      fgSubtle: '#B09599',
      border: 'rgba(62, 42, 47, 0.08)',
      borderStrong: 'rgba(62, 42, 47, 0.16)',
      accent: '#D47A8C',
      accentSoft: '#F7DCE0',
      accentFg: '#FFFFFF',
      highlight: '#F7DCE0',
      success: '#5B7A5E',
      warning: '#C4842A',
      error: '#A04040',
      backdrop: 'rgba(62, 42, 47, 0.40)',
      shadow: 'rgba(62, 42, 47, 0.10)',
    },
  },
  hanami: {
    meta: { name: 'hanami', label: 'Hanami', glyph: '灯', isDark: true },
    colors: {
      bg: '#14100C',
      bgElev: '#1E1814',
      bgSunken: '#0E0B08',
      fg: '#F5E9D4',
      fgMuted: '#B0987A',
      fgSubtle: '#6E6050',
      border: 'rgba(245, 233, 212, 0.10)',
      borderStrong: 'rgba(245, 233, 212, 0.18)',
      accent: '#E04B2A',
      accentSoft: 'rgba(224, 75, 42, 0.18)',
      accentFg: '#FFFFFF',
      highlight: 'rgba(242, 179, 61, 0.45)',
      success: '#6B9B6F',
      warning: '#D4943A',
      error: '#C05050',
      backdrop: 'rgba(0, 0, 0, 0.6)',
      shadow: 'rgba(0, 0, 0, 0.45)',
    },
  },
  stamp: {
    meta: { name: 'stamp', label: 'Stamp', glyph: '印', isDark: false },
    colors: {
      // 1930s Japanese postage palette — vermillion + cream paper + sumi ink.
      bg: '#EBE2D0',         // paper
      bgElev: '#F0E6D2',     // paper-warm
      bgSunken: '#D9CDB6',   // paper-deep
      fg: '#1A1411',         // sumi
      fgMuted: '#3B2F26',    // sumi-soft
      fgSubtle: '#6F6358',   // ash
      border: '#1A1411',     // every border is sumi under stamp
      borderStrong: '#1A1411',
      accent: '#C8362B',     // vermillion
      accentSoft: 'rgba(200, 54, 43, 0.18)',
      accentFg: '#EBE2D0',   // paper on red
      highlight: 'rgba(200, 54, 43, 0.35)',
      success: '#3B7A40',
      warning: '#B8802A',
      error: '#9B2A22',      // vermillion-deep
      backdrop: 'rgba(26, 20, 17, 0.45)',
      shadow: 'rgba(26, 20, 17, 1)', // hard ink shadow
    },
    fonts: STAMP_FONTS,
    shape: (colors) => ({
      surface: stampSurface(colors),
      chip: stampChip(colors),
      button: stampButton(colors),
      sectionLabel: { color: colors.accent, letterSpacing: 2.4, fontWeight: '500' },
    }),
  },
};

function defaultShape(colors: ThemeColors): ThemeShape {
  return {
    surface: softSurface(colors),
    chip: softChip(colors),
    button: softButton(colors),
    sectionLabel: { color: colors.fgMuted, letterSpacing: 1.5, fontWeight: '500' },
  };
}

function buildTheme(palette: Palette): Theme {
  const baseShape = defaultShape(palette.colors);
  const overrideShape = palette.shape?.(palette.colors) ?? {};
  return {
    meta: palette.meta,
    colors: palette.colors,
    fonts: { ...DEFAULT_FONTS, ...(palette.fonts ?? {}) },
    shape: { ...baseShape, ...overrideShape },
  };
}

const THEMES: Record<ThemeName, Theme> = Object.fromEntries(
  (Object.entries(PALETTES) as [ThemeName, Palette][]).map(([name, p]) => [name, buildTheme(p)]),
) as Record<ThemeName, Theme>;

export function getTheme(name: ThemeName): Theme {
  return THEMES[name];
}

export function listThemes(): Theme[] {
  return THEME_NAMES.map(getTheme);
}

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
 * Static font lookup — the *Default* theme's fonts. Components that don't
 * yet need theme-aware typography keep importing from here. Theme-aware
 * code (anything that should change typeface under the Stamp theme) should
 * read fonts via `useFonts()` from `theme/ThemeContext`.
 */
export const fontFamily = DEFAULT_FONTS;
