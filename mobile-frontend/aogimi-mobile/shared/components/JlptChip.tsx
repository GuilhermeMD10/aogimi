import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useColors, useFonts } from '@/theme/ThemeContext';
import { radius } from '@/theme/tokens';

export type JlptChipProps = {
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest). */
  level: number;
  /** Compact = smaller font + tighter padding (for inline result rows). */
  compact?: boolean;
  style?: ViewStyle;
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-level palette — warm for easy levels, cool for hard. One of the two
// standing hex exceptions (with `ResultButtons`): the level *is* the colour's
// meaning, so it doesn't come from `palette`.
//
// **Darkened 2026-08-11.** These were the web's mid-tones (#8FB08A, #D9A557, …),
// chosen to sit on a dark chip. This component uses each value twice — as the
// label ink *and*, at 18/32% alpha, as the chip's fill and border — so on the
// light baseline the mid-tones became pale text on a pale wash. Same five hues,
// same warm→cool ordering, taken down to where they read as text on white.
// ─────────────────────────────────────────────────────────────────────────────

const JLPT_PALETTE: Record<number, string> = {
  5: '#3F6B39', // green   — N5 (easiest)
  4: '#6B5A2E', // sand
  3: '#8A5A00', // amber
  2: '#9A3E1E', // orange  (matches accent family)
  1: '#6E2F4C', // plum    — N1 (hardest)
};

// ─────────────────────────────────────────────────────────────────────────────
// Soft tinted pill (matches the web JlptChip)
// ─────────────────────────────────────────────────────────────────────────────

export function JlptChip({ level, compact, style }: JlptChipProps) {
  const c = useColors();
  const f = useFonts();
  const color = JLPT_PALETTE[level] ?? c.fgMuted;

  return (
    <View
      accessibilityLabel={`JLPT N${level}`}
      style={[
        defaultStyles.pill,
        compact && defaultStyles.pillCompact,
        {
          // RGBA at ~18% gives the same color-mix(in oklab, color 18%) feel
          // the web uses, without depending on color-mix.
          backgroundColor: tint(color, 0.18),
          borderColor: tint(color, 0.32),
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          defaultStyles.label,
          compact && defaultStyles.labelCompact,
          { color, fontFamily: f.ui },
        ]}
      >
        N{level}
      </Text>
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillCompact: {
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  labelCompact: {
    fontSize: 10,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: blend `color` with paper (white-ish) at the given alpha. Cheap
// substitute for CSS color-mix(in oklab, ...) — close enough at the chip
// size we render.
// ─────────────────────────────────────────────────────────────────────────────

function tint(hex: string, alpha: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
