import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  style,
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (c: Colors) =>
  StyleSheet.create({
    base: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    secondary: {
      backgroundColor: c.bgSurface,
      borderColor: c.border,
    },
    pressed: { opacity: 0.8 },
    disabled: { opacity: 0.4 },
    label: { fontSize: fontSize.sm, fontWeight: '600' },
    labelPrimary: { color: c.accentOn },
    labelSecondary: { color: c.textPrimary },
  });
