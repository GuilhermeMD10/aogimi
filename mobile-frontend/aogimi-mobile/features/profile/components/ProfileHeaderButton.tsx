import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * A small outline control on Profile's title line — the "Edit" button, and
 * the Settings button that sits beside it.
 *
 * Settings is icon-only because the pair has to fit next to the title on a
 * 390pt screen and a gear is unambiguous; it carries an `accessibilityLabel`
 * so it is still named for a screen reader. Edit keeps its word, since there
 * is no equally obvious glyph for "change your avatar".
 */
export function ProfileHeaderButton({
  label,
  icon,
  iconOnly = false,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  iconOnly?: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <Touchable
      surface="glass"
      radius={radius.md}
      minTarget={false}
      hitSlop={6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, iconOnly && styles.square]}
    >
      {icon !== undefined && <Feather name={icon} size={15} color={p.soft} />}
      {!iconOnly && <Text style={styles.label}>{label}</Text>}
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        // Fill and hairline come from `surface="glass"`. The height stays 34 —
        // a header control sized to the title beside it — with `hitSlop`
        // carrying the target to the floor.
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 34,
          paddingHorizontal: spacing.md,
        },
        // Square rather than pill-padded, so the icon sits centred in a box the
        // same height as its labelled sibling.
        square: { width: 34, paddingHorizontal: 0 },
        label: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xs + 1,
          fontWeight: '700',
          color: p.soft,
        },
      }),
    [p],
  );
}
