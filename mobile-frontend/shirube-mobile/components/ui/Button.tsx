import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, radius } from '@/theme/tokens';
import { createThemedComponent } from '@/theme/createThemedComponent';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default — soft pill
// ─────────────────────────────────────────────────────────────────────────────

function DefaultButton({
  label,
  onPress,
  variant = 'primary',
  full,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const c = useColors();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary' ? c.accent : variant === 'secondary' ? c.bgElev : 'transparent';
  const fg =
    variant === 'primary' ? c.accentFg : variant === 'secondary' ? c.fg : c.fg;
  const borderColor = variant === 'secondary' ? c.borderStrong : 'transparent';
  const borderWidth = variant === 'secondary' ? StyleSheet.hairlineWidth : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        defaultStyles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          width: full ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[defaultStyles.label, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const defaultStyles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: { fontSize: fontSize.md, fontWeight: '600', letterSpacing: -0.1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Stamp — sumi border + hard offset shadow + crisp 2px corners + display serif
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// Public — single Button entry point that swaps implementations by theme.
// ─────────────────────────────────────────────────────────────────────────────

export const Button = createThemedComponent<ButtonProps>(
  DefaultButton,
  {},
  'Button',
);
