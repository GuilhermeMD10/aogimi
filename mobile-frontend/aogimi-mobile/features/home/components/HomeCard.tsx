import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * Home's card shell, and the section header that goes inside it.
 *
 * The handoff's surface recipe, unchanged in both columns: `paper` fill, a 1px
 * `paperBd` hairline, radius 16, **no shadow**. Separation comes from the fill
 * and the edge, which is what lets the same component work on Night's charcoal
 * as on Day's white.
 *
 * ── Why this is local to `home/` ────────────────────────────────────────────
 * It looks like a shared primitive and will probably become one. The house rule
 * is that a primitive earns `shared/components/` once a *second* feature uses
 * it, and right now nothing else does — promoting it early would freeze an API
 * against exactly one caller. Move it when the next redesigned screen wants it.
 */
export function HomeCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return <View style={[styles.card, style]}>{children}</View>;
}

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
        card: {
          backgroundColor: p.paper,
          borderWidth: 1,
          borderColor: p.paperBd,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
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
