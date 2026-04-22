import { Platform } from 'react-native';

export type ThemeName = 'default' | 'kanagawa' | 'sakura' | 'hanami';

export const THEME_NAMES: ThemeName[] = ['default', 'kanagawa', 'sakura', 'hanami'];

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

export type Theme = {
  meta: ThemeMeta;
  colors: ThemeColors;
};

const PALETTES: Record<ThemeName, Theme> = {
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
};

export function getTheme(name: ThemeName): Theme {
  return PALETTES[name];
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

export const fontFamily = {
  ui: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) as string,
  display: 'Lora_600SemiBold',
  displayBold: 'Lora_700Bold',
  reader: 'Lora_400Regular',
  readerItalic: 'Lora_400Regular_Italic',
  jp: JP_STACK,
  jpSans: JP_SANS_STACK,
} as const;
