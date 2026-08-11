import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, palette, radius } from '@/theme/tokens';

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
// Soft pill
// ─────────────────────────────────────────────────────────────────────────────

export function Button({
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

  // Primary reads `palette.btn` / `btnInk` directly, not the legacy `accent` /
  // `accentFg` pair: `accent` is the app's *emphasis* hue, so wiring primary to
  // it would make every primary button in the app accent-coloured. The primary
  // action is the `btn` pair, whatever that pair ends up being.
  const bg =
    variant === 'primary' ? palette.btn : variant === 'secondary' ? c.bgElev : 'transparent';
  const fg =
    variant === 'primary' ? palette.btnInk : variant === 'secondary' ? c.fg : c.fg;
  const borderColor = variant === 'secondary' ? c.borderStrong : 'transparent';
  const borderWidth = variant === 'secondary' ? StyleSheet.hairlineWidth : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        defaultStyles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
          opacity: isDisabled ? 0.55 : 1,
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

