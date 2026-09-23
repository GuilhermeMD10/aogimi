import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { usePalette, useTheme, CANVAS, spacing } from '@/theme';

/**
 * **The canvas.** Every screen renders inside this, and no screen paints its
 * own background.
 *
 * DESIGN.md's sky, in three layers, bottom to top: a vertical gradient
 * (`canvasTop` → `canvasBottom`), two or three radial washes, then the
 * content. Night is an indigo sky with a magenta nebula above and a blue aurora
 * below; Day is a warm sakura white with sakura, sky and leaf washes.
 *
 * The handoff also specified a decorative star field over the washes. It is
 * **gone** — it read as noise, and the only stars in the app now are the
 * user's own cards in `features/sky/map/**`.
 *
 * The **colours** are palette tokens and the **geometry** is `CANVAS` in
 * `theme/tokens.ts`, because the two skies genuinely place their washes
 * differently — one renderer, two specs.
 *
 * ── Why SVG for the washes ─────────────────────────────────────────────────
 * `expo-linear-gradient` has no radial mode. `react-native-svg` does, and an
 * `<Ellipse>` filled with a `RadialGradient` in object bounding-box units is
 * the direct translation of CSS's `radial-gradient(ellipse … at x y)`. Three
 * ellipses on a static layer cost nothing; they never re-render.
 */
export function Screen({
  children,
  edges = ['top'],
  padded = false,
  style,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  /** Horizontal screen padding — DESIGN.md's 20pt safe gutter. */
  padded?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const wash = CANVAS[themeName];
  // SVG `<Defs>` ids are global to the renderer, and a stack navigator keeps
  // the screen under the current one mounted — two `Screen`s sharing the id
  // `nebula` means the second one's gradient silently wins on both. `useId`
  // makes them per-instance.
  const id = useId();

  return (
    <View style={[styles.root, { backgroundColor: p.bg }]}>
      <LinearGradient
        colors={[p.canvasTop, p.canvasBottom]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* The radial washes. A full-bleed `Rect` rather than an `Ellipse`: the
          gradient does the shaping, and an elliptical *shape* would leave the
          four corners of the screen unpainted. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient
            id={`${id}-nebula`}
            cx={wash.nebula.cx}
            cy={wash.nebula.cy}
            rx={wash.nebula.rx}
            ry={wash.nebula.ry}
          >
            <Stop offset="0" stopColor={p.nebula} />
            <Stop offset={wash.nebula.stop} stopColor={p.nebula} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id={`${id}-aurora`}
            cx={wash.aurora.cx}
            cy={wash.aurora.cy}
            rx={wash.aurora.rx}
            ry={wash.aurora.ry}
          >
            <Stop offset="0" stopColor={p.aurora} />
            <Stop offset={wash.aurora.stop} stopColor={p.aurora} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id={`${id}-bloom`}
            cx={wash.bloom.cx}
            cy={wash.bloom.cy}
            rx={wash.bloom.rx}
            ry={wash.bloom.ry}
          >
            <Stop offset="0" stopColor={p.bloom} />
            <Stop offset={wash.bloom.stop} stopColor={p.bloom} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-nebula)`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-aurora)`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-bloom)`} />
      </Svg>

      <SafeAreaView edges={edges} style={styles.root}>
        <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.screenX },
});
