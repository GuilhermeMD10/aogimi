import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { type Palette } from '@/theme/tokens';

/**
 * DESIGN.md's progress track: 4pt tall (6pt inside a book row), radius 4,
 * `track` ground, sakura fill with a **leading-edge glow**.
 *
 * The glow is on the fill's own view, so it sits at the fill's right edge and
 * travels with it — that is the whole effect, and it is why the fill is a
 * separate view rather than a border on the track.
 *
 * `value` is 0–100 and is **clamped here**: a book that reported 104 (a stale
 * sync, a malformed CFI) would otherwise render a fill wider than its track,
 * and every caller would have to remember the same `Math.min`.
 */
export function ProgressBar({
  value,
  height = 4,
  style,
}: {
  /** Percent, 0–100. Clamped. */
  value: number;
  /** 4 on a card, 6 in a book row. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);
  const pct = Math.max(0, Math.min(100, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[s.track, { height, borderRadius: height }, style]}
    >
      <View style={[s.fill, { width: `${pct}%`, borderRadius: height }]} />
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        // No `overflow: 'hidden'` — it would clip the fill's glow back to the
        // track. The fill carries the same radius instead, which keeps the two
        // ends flush without clipping.
        track: { backgroundColor: p.track, width: '100%' },
        fill: {
          height: '100%',
          backgroundColor: p.fill,
          shadowColor: p.glowProgress,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
        },
      }),
    [p],
  );
}
