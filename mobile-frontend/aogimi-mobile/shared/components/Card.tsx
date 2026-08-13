import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { radius, spacing, type Palette } from '@/theme/tokens';

/**
 * The app's card surface — `paper` fill, 1px `paperBd` hairline, radius 16,
 * **no shadow**. Separation comes from the fill and the edge, which is what
 * lets one component work on Night's charcoal and Day's white alike.
 *
 * Promoted out of `features/home/` once Profile and Settings wanted the same
 * box — the house rule is that a primitive earns `shared/components/` on its
 * second caller.
 *
 * `padded={false}` for a card whose children run edge to edge: a divided row
 * group needs its hairlines to touch both sides, so it supplies its own
 * per-row padding instead. Such a card should also carry `overflow: 'hidden'`
 * via `clip`, or square row corners will poke past the rounded edge.
 */
export function Card({
  children,
  padded = true,
  clip = false,
  style,
}: {
  children: React.ReactNode;
  padded?: boolean;
  clip?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={[styles.card, padded && styles.padded, clip && styles.clip, style]}>
      {children}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: p.paper,
          borderWidth: 1,
          borderColor: p.paperBd,
          borderRadius: radius.lg,
        },
        padded: { padding: spacing.lg },
        clip: { overflow: 'hidden' },
      }),
    [p],
  );
}
