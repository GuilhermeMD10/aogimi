import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackBar } from '@/shared/components/BackBar';
import { Screen } from '@/shared/components/Screen';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';
import { DockBar, type DockSlot } from '../DockBar';
import type { FeatherName } from '../DockItem';
import { DOCK_VARIANTS, type DockVariant } from './variants';

/**
 * The dock tuning lab — the dock on its own, away from the app.
 *
 * **Dev only.** Reached from a DEVELOPER group in Settings that is not drawn in
 * a release build, and the route redirects out of one; see the route file.
 * Strings are hardcoded English for the same reason — a screen only the author
 * ever opens has no business in the translation files.
 *
 * **The dock is now tested from the app itself** — it is wired into the tab
 * navigator with these exact values, so this screen is no longer where the
 * behaviour is judged. What it is still good for is looking at one dock in
 * isolation, over a ground chosen to show what the app's own screens will not.
 *
 * ── It routes nowhere ────────────────────────────────────────────────────────
 * It keeps its own `current` in local state and selecting a slot only moves
 * that. It is `DockBar`, the same component the real dock wraps — not a mock-up
 * of it — so what is felt here is what ships; only the navigator on the other
 * side of `onSelect` is missing.
 *
 * ── A ground under the shadows ───────────────────────────────────────────────
 * Every mark in the dock is separated from the screen by its own drop shadow
 * and nothing else, and a shadow on a flat background is the one case where it
 * is impossible to tell whether it is working. So the dock is given a coloured
 * ground: banded rather than smooth, because a shadow reads most clearly where
 * it crosses an edge. The colours are the cover fills, the palette's only
 * saturated grounds, already defined for both themes.
 *
 * ── Closing it ───────────────────────────────────────────────────────────────
 * `open` is controlled, and there is no backdrop here — the real dock's lives
 * in `Dock`, which is the only host that can draw one full-screen. Picking a
 * slot closes it, as it does in the app.
 */

const SLOTS: readonly DockSlot[] = [
  { icon: 'home' as FeatherName, label: 'Home' },
  { icon: 'book-open' as FeatherName, label: 'Reader' },
  { icon: 'search' as FeatherName, label: 'Dictionary' },
  { icon: 'star' as FeatherName, label: 'Sky' },
];

/** Four flat bands with a 2%-wide flip between them — see the header. */
const BAND_STOPS = [0, 0.24, 0.26, 0.49, 0.51, 0.74, 0.76, 1] as const;

export function DockLabView() {
  const p = usePalette();
  const styles = useStyles(p);
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.padded}>
          <BackBar title="Dock lab" subtitle="開発" />
          <Text style={styles.intro}>
            The app&apos;s own dock, on a ground picked to show its shadows. Hold to open it, slide
            across to move the highlight, tap a slot to select it. Nothing here navigates — the dock
            in the tab bar is the same one, wired up.
          </Text>
        </View>

        {DOCK_VARIANTS.map((variant) => (
          <LabDock
            key={variant.key}
            variant={variant}
            open={openKey === variant.key}
            onOpenChange={(next) => setOpenKey(next ? variant.key : null)}
            styles={styles}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

/**
 * One bar plus its caption.
 *
 * Its own component so each bar's `current` is its own state — four of them in
 * the parent would re-render all four bars on every selection, and a bar that
 * re-renders mid-animation is exactly what this screen is trying to measure.
 *
 * **Full-bleed on purpose.** `DockBar` reads the finger's screen-absolute x and
 * assumes its host spans the screen from x = 0, as the real dock's does, so the
 * row must not be inside the page's horizontal padding — the caption is padded
 * instead.
 */
function LabDock({
  variant,
  open,
  onOpenChange,
  styles,
}: {
  variant: DockVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styles: ReturnType<typeof useStyles>;
}) {
  const p = usePalette();
  const [current, setCurrent] = useState(0);

  const bar = (
    <DockBar
      slots={SLOTS}
      current={current}
      onSelect={setCurrent}
      open={open}
      onOpenChange={onOpenChange}
      holdMs={variant.holdMs}
      slideMs={variant.slideMs}
      haptics={variant.haptics}
    />
  );

  return (
    <View style={styles.block}>
      <View style={styles.padded}>
        <Text style={styles.name}>{variant.name}</Text>
        <Text style={styles.spec}>
          hold {variant.holdMs}ms · open {variant.slideMs}ms · {variant.feel}
        </Text>
      </View>

      {/* The caption stays on the page's own background — the ground is only
          under the dock, where the shadows have to be read. */}
      <LinearGradient
        colors={[p.cover1, p.cover1, p.cover2, p.cover2, p.cover3, p.cover3, p.cover4, p.cover4]}
        locations={BAND_STOPS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ground}
      >
        {bar}
      </LinearGradient>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingBottom: spacing.xxl },
        padded: { paddingHorizontal: spacing.xl },
        intro: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          lineHeight: 20,
          color: p.muted,
          marginBottom: spacing.lg,
        },
        block: { marginTop: spacing.xl },
        // Full-bleed: `DockBar` reads the finger's screen-absolute x, so its
        // host still has to start at x = 0. Only the vertical padding is the
        // ground's own, so the shadows have colour to fall on above and below.
        ground: { paddingVertical: spacing.xl },
        name: {
          fontFamily: fontFamily.display,
          fontSize: fontSize.md,
          color: p.ink,
        },
        spec: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs,
          color: p.muted,
          marginTop: spacing.xs,
          marginBottom: spacing.sm,
        },
      }),
    [p],
  );
}
