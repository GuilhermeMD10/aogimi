import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Touchable, Glass } from '@/shared/components';
import { FlameIcon } from '@/shared/icons/flame';
import { usePalette, useTheme, radius, spacing, type, type Palette } from '@/theme';

/** The brand mark's circle, the avatar's circle, and the streak chip's height —
 *  DESIGN.md's "Header pills (Home)" gives all three. */
const MARK = 40;
const STREAK_H = 36;

/**
 * Home's header: the brand on the left, the streak chip and the avatar on the
 * right.
 *
 * ── The brand reads differently in the two themes ──────────────────────────
 * DESIGN.md's header pills: Night sets the wordmark as `Aogimi` at 18px beside
 * the 仰 mark; Day sets it as `AOGIMI`, 12px tracked 0.16em in ink-muted. That
 * is the design's own call — on the light canvas a solid 18px wordmark
 * outweighs everything under it — and it is why this component reads
 * `themeName` rather than only the palette.
 *
 * ── The avatar is load-bearing ─────────────────────────────────────────────
 * Profile left the dock in the route restructure, so this button is the only
 * way to reach it. It is a 40pt circle — a real target, not decoration — over
 * the `accentDeep → accentTrunk` gradient DESIGN.md specifies, with the user's
 * kamon on top. The handoff draws the gradient bare or with initials; the kamon
 * is what this app already stores and means the same thing.
 */
export function HomeTopBar({
  brandName,
  avatarGlyph,
  daysStudied,
  streakLabel,
  profileLabel,
  onProfilePress,
}: {
  brandName: string;
  avatarGlyph: string;
  /**
   * Distinct days studied, all time. **Not a consecutive streak** — the API has
   * no such aggregate — so the chip reads "day N" rather than claiming a run.
   * Zero hides it entirely: a signed-out or offline user gets 0 from the API
   * too, and the app should not claim they have never studied.
   */
  daysStudied: number;
  /** Already interpolated, e.g. `24日目`. */
  streakLabel: string;
  profileLabel: string;
  onProfilePress: () => void;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const styles = useStyles(p);
  const isNight = themeName === 'night';

  return (
    <View style={styles.bar}>
      <View style={styles.brandRow}>
        <Glass tier={2} radius={MARK / 2} style={styles.mark}>
          <Text style={styles.markGlyph}>仰</Text>
        </Glass>
        <Text style={isNight ? styles.brandName : styles.brandNameDay}>
          {isNight ? brandName : brandName.toUpperCase()}
        </Text>
      </View>

      <View style={styles.right}>
        {daysStudied > 0 && (
          <Glass tier={1} radius={radius.control} shadow={false} style={styles.streak}>
            <FlameIcon size={14} color={p.warn} />
            <Text style={styles.streakLabel}>{streakLabel}</Text>
          </Glass>
        )}

        <Touchable
          minTarget={false}
          hitSlop={6}
          onPress={onProfilePress}
          accessibilityRole="button"
          accessibilityLabel={profileLabel}
          style={styles.avatar}
        >
          <LinearGradient
            // 135° — the handoff's `linear-gradient(135deg, …)`, which in RN's
            // unit square is corner to corner.
            colors={[p.accentDeep, p.accentTrunk]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.avatarGlyph}>{avatarGlyph}</Text>
        </Touchable>
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
        },

        brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
        mark: { width: MARK, height: MARK, alignItems: 'center', justifyContent: 'center' },
        markGlyph: {
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 18,
          fontWeight: '700',
          color: p.ink,
        },
        brandName: { ...type.headlineMd, color: p.ink },
        brandNameDay: {
          ...type.eyebrow,
          fontSize: 12,
          lineHeight: 16,
          letterSpacing: 1.68,
          color: p.muted,
        },

        right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

        streak: {
          height: STREAK_H,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.md,
        },
        streakLabel: {
          ...type.caption,
          fontFamily: type.headerTitle.fontFamily,
          color: p.ink,
        },

        avatar: {
          width: MARK,
          height: MARK,
          // Decorative circle, not a token radius — half the box, by definition.
          borderRadius: MARK / 2,
          borderWidth: 1,
          borderColor: p.bdA,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        avatarGlyph: {
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 16,
          fontWeight: '700',
          color: p.avatarInk,
        },
      }),
    [p],
  );
}
