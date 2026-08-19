import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.button, iconOnly && styles.square]}
    >
      {icon !== undefined && <Feather name={icon} size={15} color={p.soft} />}
      {!iconOnly && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 34,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: p.paperBd,
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
