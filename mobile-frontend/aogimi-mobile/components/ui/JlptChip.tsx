import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useColors, useFonts } from '@/theme/ThemeContext';
import { createThemedComponent } from '@/theme/createThemedComponent';
import { radius } from '@/theme/tokens';

export type JlptChipProps = {
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest). */
  level: number;
  /** Compact = smaller font + tighter padding (for inline result rows). */
  compact?: boolean;
  style?: ViewStyle;
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-level palette — warm for easy levels, cool for hard. Mirrors the web
// `components/ui/JlptChip.tsx` palette so a user moving between web and mobile
// gets the same color signal at a glance.
// ─────────────────────────────────────────────────────────────────────────────

const JLPT_PALETTE: Record<number, string> = {
  5: '#8FB08A', // green   — N5 (easiest)
  4: '#B5A27C', // sand
  3: '#D9A557', // amber
  2: '#D97757', // orange  (matches accent family)
  1: '#A05C7B', // plum    — N1 (hardest)
};

// ─────────────────────────────────────────────────────────────────────────────
// Default — soft tinted pill (matches the web JlptChip)
// ─────────────────────────────────────────────────────────────────────────────

function DefaultJlptChip({ level, compact, style }: JlptChipProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Public — single JlptChip entry point
// ─────────────────────────────────────────────────────────────────────────────

export const JlptChip = createThemedComponent<JlptChipProps>(
  DefaultJlptChip,
  {},
  'JlptChip',
);
