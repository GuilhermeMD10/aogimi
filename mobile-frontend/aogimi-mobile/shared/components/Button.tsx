import { ActivityIndicator, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Touchable } from './Touchable';
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
  // Secondary and ghost take the glass wash instead of a fill: they are the
  // app's "other" buttons, which is exactly what the web dresses in
  // `.glass-button`. Primary keeps its solid `btn` face — glass over a
  // saturated fill only muddies it.
  const glass = variant !== 'primary';
  const bg = variant === 'primary' ? palette.btn : 'transparent';
  const fg =
    variant === 'primary' ? palette.btnInk : variant === 'secondary' ? c.fg : c.fg;
  // The glass surface draws its own hairline, so only primary states one here
  // (it has none) — leaving both at zero and letting `surface` decide.
  const borderWidth = 0;

  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      surface={glass ? 'glass' : 'none'}
      radius={radius.pill}
      // 48pt tall from its own padding — the floor would only add width.
      minTarget={false}
      style={[
        defaultStyles.base,
        {
          backgroundColor: bg,
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
    </Touchable>
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

