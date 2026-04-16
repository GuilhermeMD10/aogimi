import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';

export const Input = forwardRef<TextInput, TextInputProps>(function Input(props, ref) {
  const styles = useThemedStyles(createStyles);
  const c = useColors();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.textSecondary}
      {...props}
      style={[styles.input, props.style]}
    />
  );
});

const createStyles = (c: Colors) =>
  StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      backgroundColor: c.bgSurface,
    },
  });
