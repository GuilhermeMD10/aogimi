import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, type Palette } from '@/theme/tokens';

/**
 * Home's section header.
 *
 * **The card surface moved to `shared/components/Card`** when Profile and
 * Settings became its second and third callers — the house rule is that a
 * primitive earns a shared home on its second use. `Card` is re-exported here
 * so Home's components keep one import for "the box and its header".
 */
export { Card } from '@/shared/components/Card';

/**
 * A card's title row with a trailing "VIEW ALL →" affordance.
 *
 * The arrow is part of the label rather than an icon: at 9.5px with tracking it
 * is a typographic mark, and a `Feather` glyph at that size renders heavier
 * than the text it sits beside.
 */
export function SectionHead({
  title,
  action,
  onPress,
}: {
  title: string;
  action: string;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
        <Text style={styles.sectionAction}>{action} →</Text>
      </Pressable>
    </View>
  );
}

/**
 * Styles that depend on the active palette.
 *
 * Every Home component follows this shape: a `useStyles(p)` factory memoised on
 * the palette object. A module-scope `StyleSheet.create` cannot see the theme,
 * and the palette identity only changes when the theme does, so this recomputes
 * exactly twice per session at worst.
 */
function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        sectionHead: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        },
        sectionTitle: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.lg,
          fontWeight: '700',
          color: p.ink,
        },
        sectionAction: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1.5,
          letterSpacing: 1,
          color: p.muted,
        },
      }),
    [p],
  );
}
