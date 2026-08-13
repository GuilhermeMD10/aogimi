import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandGlyph } from '@/shared/components/BrandGlyph';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * Home's top bar: the brand mark on the left, the days-studied pill and the
 * avatar on the right.
 *
 * **The avatar is load-bearing.** Profile left the dock in the route
 * restructure, so this button is the only way to reach it — that is why it has
 * a `hitSlop` and an explicit label rather than being decoration.
 */
export function HomeTopBar({
  avatarGlyph,
  daysStudied,
  studiedLabel,
  profileLabel,
  onProfilePress,
}: {
  avatarGlyph: string;
  /** Distinct days studied, all time. Zero hides the pill entirely. */
  daysStudied: number;
  /**
   * The pill's micro-label. The handoff splits this as "STUDIED" over
   * "64 days", but `t()` has no pluralisation, so "1 days" would be
   * unavoidable. Moving the noun into the label — "DAYS STUDIED" over "64" —
   * keeps the two-line shape and is correct at every count, without building
   * plural machinery for one string.
   */
  studiedLabel: string;
  profileLabel: string;
  onProfilePress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <View style={styles.bar}>
      <View style={styles.brandRow}>
        <BrandGlyph size={32} />
        <Text style={styles.brandName}>aogimi</Text>
      </View>

      <View style={styles.right}>
        {/* Hidden at zero rather than shown as "0 days": a signed-out or
            offline user gets 0 from the API too, and the app should not
            claim they have never studied. */}
        {daysStudied > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillKicker}>{studiedLabel}</Text>
            <Text style={styles.pillValue}>{daysStudied}</Text>
          </View>
        )}

        <Pressable
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel={profileLabel}
          hitSlop={8}
          style={styles.avatar}
        >
          <Text style={styles.avatarGlyph}>{avatarGlyph}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        bar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: spacing.sm,
        },
        brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 1 },
        brandName: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.lg,
          fontWeight: '700',
          color: p.ink,
        },

        right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

        // Asymmetric padding: the label side needs breathing room, the avatar
        // side is already inset by the circle's own bounds.
        pill: {
          borderWidth: 1,
          borderColor: p.paperBd,
          borderRadius: radius.md,
          backgroundColor: p.paperTile,
          paddingVertical: 5,
          paddingHorizontal: spacing.md,
        },
        pillKicker: {
          fontFamily: fontFamily.mono,
          fontSize: 8,
          letterSpacing: 1.1,
          color: p.faint,
        },
        pillValue: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xs + 1,
          fontWeight: '700',
          color: p.ink,
        },

        avatar: {
          width: 30,
          height: 30,
          // Decorative circle, not a token radius — half the box, by definition.
          borderRadius: 15,
          backgroundColor: p.avatar,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarGlyph: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm,
          fontWeight: '700',
          color: p.avatarInk,
        },
      }),
    [p],
  );
}
