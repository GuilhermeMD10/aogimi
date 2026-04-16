/**
 * Night Library — design tokens.
 *
 * Single source of truth for the mobile visual language. Both light and dark
 * palettes live here; the active set is resolved at runtime by ThemeContext.
 * Non-color tokens (spacing, radii, font sizes, font families) are static
 * and shared across both modes.
 *
 * Web mirrors these values in `web-frontend/langecko-web/app/globals.css`.
 */
import { Platform } from 'react-native';

// ── Color palettes ─────────────────────────────────────────────────────

export const lightColors = {
  // Surfaces
  bgBase:    '#FAF7F2',   // warm off-white parchment
  bgSurface: '#FFFFFF',   // card / panel
  bgRaised:  '#F0EBE3',   // inset areas, toolbars

  // Border
  border: '#DDD6CB',      // warm gray rule

  // Text
  textPrimary:   '#2C2825', // deep warm charcoal
  textSecondary: '#8B8178', // muted warm gray

  // Accent — refined gilt gold (old book edges)
  accent:     '#B8962F',
  accentSoft: '#F5EDDA',   // tinted badge / highlight bg
  accentDark: '#96790F',   // pressed / hover
  accentOn:   '#2C2825',   // text sitting on accent

  // Feedback
  success: '#5B7A5E',     // sage
  warning: '#C4842A',     // amber
  error:   '#A04040',     // brick

  // Overlays
  backdrop: 'rgba(44, 40, 37, 0.5)',
  shadow:   'rgba(44, 40, 37, 0.08)',
} as const;

export const darkColors = {
  // Surfaces
  bgBase:    '#1A1714',   // warm near-black
  bgSurface: '#242019',   // card / panel — lifted
  bgRaised:  '#2E2A22',   // toolbar, nav chrome

  // Border
  border: '#3D372E',      // subtle warm separation

  // Text
  textPrimary:   '#E8E0D4', // warm cream
  textSecondary: '#9B9285', // muted parchment

  // Accent — same gold family, brighter for dark contrast
  accent:     '#D4AA3C',
  accentSoft: '#332C1A',   // dark gold tint
  accentDark: '#B8962F',   // pressed / hover
  accentOn:   '#1A1714',   // text sitting on accent

  // Feedback
  success: '#6B9B6F',     // sage, lifted
  warning: '#D4943A',     // amber, lifted
  error:   '#C05050',     // brick, lifted

  // Overlays
  backdrop: 'rgba(0, 0, 0, 0.6)',
  shadow:   'rgba(0, 0, 0, 0.4)',
} as const;

export type Colors = { [K in keyof typeof lightColors]: string };

// ── Static tokens (theme-independent) ──────────────────────────────────

export const radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;

export const fontSize = {
  xs:      11,
  sm:      13,
  md:      15,
  lg:      17,
  xl:      20,
  xxl:     24,
  display: 32,
} as const;

export const fontFamily = {
  /** Serif display — screen titles, hero text, section headers. */
  serif:         'Lora_400Regular',
  serifSemiBold: 'Lora_600SemiBold',
  serifBold:     'Lora_700Bold',
  serifItalic:   'Lora_400Regular_Italic',
  /** Body / UI — uses the system sans-serif (SF Pro / Roboto). */
  sans: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) as string,
} as const;

// ── Backward-compatibility alias ───────────────────────────────────────
// Components that haven't migrated to `useColors()` yet can still import
// this. Remove once all 27 consumers use the themed hook.

/** @deprecated Import `useColors` from `@/theme/ThemeContext` instead. */
export const colors = lightColors;
