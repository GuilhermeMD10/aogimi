import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * The handoff's destructive action: 48px tall, transparent, a 1.5px
 * danger-tinted border and `danger` ink.
 *
 * Outline rather than filled, deliberately — a solid vermillion block would
 * outweigh every real action on the page, and the only two uses (sign out on
 * Profile and on Settings) are things you should be able to find but not hit
 * by accident.
 *
 * Not a `variant` on `shared/components/Button`: that component reads the
 * Day-locked static palette and is on the list to migrate, so widening its API
 * now would mean unpicking it twice.
 */
export function DangerButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        button: {
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: p.dangerBd,
          marginTop: spacing.lg,
        },
        label: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm + 0.5,
          fontWeight: '700',
          color: p.danger,
        },
      }),
    [p],
  );
}
