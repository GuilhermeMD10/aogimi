import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, radius } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  full,
  loading,
  disabled,
  style,
}: Props) {
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
        styles.base,
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
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
