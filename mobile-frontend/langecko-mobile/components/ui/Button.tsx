import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useColors, useFonts, useShape } from '@/theme/ThemeContext';
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

function StampButton({
  label,
  onPress,
  variant = 'primary',
  full,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const c = useColors();
  const f = useFonts();
  const b = useShape().button;
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary' ? c.accent : variant === 'secondary' ? c.bgElev : 'transparent';
  const fg =
    variant === 'primary' ? c.accentFg : variant === 'secondary' ? c.fg : c.fg;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        stampStyles.base,
        {
          backgroundColor: bg,
          borderColor: b.borderColor,
          borderWidth: b.borderWidth,
          borderRadius: b.radius,
          width: full ? '100%' : undefined,
          // Hard offset shadow — collapses on press to look "stamped in".
          // Keep `transform` and `shadowOffset` shapes stable across press
          // states; under Fabric, switching to `undefined` can be coerced
          // to `null` and crash the transform processor (forEach on null).
          shadowColor: b.shadowColor,
          shadowOpacity: pressed ? 0 : b.shadowOpacity,
          shadowOffset: pressed ? { width: 0, height: 0 } : b.shadowOffset,
          shadowRadius: b.shadowRadius,
          transform: [
            { translateX: pressed ? 2 : 0 },
            { translateY: pressed ? 2 : 0 },
          ],
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          allowFontScaling={false}
          style={[
            stampStyles.label,
            {
              color: fg,
              fontFamily: f.display,
              letterSpacing: b.letterSpacing,
              textTransform: b.textTransform,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const stampStyles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: { fontSize: 14, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Public — single Button entry point that swaps implementations by theme.
// ─────────────────────────────────────────────────────────────────────────────

export const Button = createThemedComponent<ButtonProps>(
  DefaultButton,
  { stamp: StampButton },
  'Button',
);
