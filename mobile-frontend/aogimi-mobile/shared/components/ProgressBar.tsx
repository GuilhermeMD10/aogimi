import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { EASE, FLIP_MS } from '@/theme/motion';
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
 *
 * ── `animated` is opt-in, and that is not a fork ───────────────────────────
 * DESIGN.md animates the fill over 300ms, and the study session is where that
 * reads: one bar, on screen the whole time, advancing a notch per grade. A
 * bar in a *list* is the opposite case — a book row scrolling into view would
 * play the same 300ms sweep from zero every time it mounted, so a shelf of
 * ten books would shimmer on every scroll. The motion belongs to a bar the
 * user is watching change, not to every bar that exists, so the caller says
 * which it is. Off by default, because most of them are the second kind.
 */
export function ProgressBar({
  value,
  height = 4,
  animated = false,
  style,
}: {
  /** Percent, 0–100. Clamped. */
  value: number;
  /** 4 on a card, 6 in a book row. */
  height?: number;
  /** Sweep to a new `value` over `FLIP_MS` instead of jumping. See above. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const s = useStyles(p);
  const pct = Math.max(0, Math.min(100, value));

  // Seeded with the first `pct` rather than 0, so a bar that mounts already
  // part-filled (a session resumed, a summary opening at 100%) shows its
  // figure instead of sweeping up to it from empty on arrival.
  const width = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    if (!animated) return;
    // `width` is a percentage string, which the native driver cannot carry —
    // it is a layout property, not a transform. One bar at a time, so the JS
    // driver is the right cost here.
    const run = Animated.timing(width, {
      toValue: pct,
      duration: FLIP_MS,
      easing: EASE,
      useNativeDriver: false,
    });
    run.start();
    return () => run.stop();
  }, [animated, pct, width]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[s.track, { height, borderRadius: height }, style]}
    >
      <Animated.View
        style={[
          s.fill,
          {
            width: animated
              ? width.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                })
              : `${pct}%`,
            borderRadius: height,
          },
        ]}
      />
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
