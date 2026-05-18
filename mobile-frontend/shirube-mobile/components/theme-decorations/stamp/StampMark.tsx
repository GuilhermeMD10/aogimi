import { Text, View, type ViewStyle } from 'react-native';
import { useColors, useFonts, useShape } from '@/theme/ThemeContext';

type Props = {
  children: string;
  size?: number;
  rotate?: number;
  style?: ViewStyle;
};

/**
 * Stamp-theme decoration: the masthead stamp mark. Larger than HankoSeal,
 * with a sumi-ink border + hard offset shadow + a dashed vermillion outline
 * ring outside (set ~8px out from the body).
 */
export function StampMark({ children, size = 96, rotate = -6, style }: Props) {
  const c = useColors();
  const f = useFonts();
  const shape = useShape();

  return (
    <View style={[{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Dashed outer ring — sits 8px outside the stamp body */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size + 16,
          height: size + 16,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: c.error,
          opacity: 0.5,
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${rotate}deg` }],
          // Inset paper ring + hard offset shadow.
          borderWidth: 2,
          borderColor: c.bg,
          shadowOffset: shape.surface.shadowOffset,
          shadowColor: shape.surface.shadowColor,
          shadowOpacity: shape.surface.shadowOpacity,
          shadowRadius: shape.surface.shadowRadius,
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            color: c.accentFg,
            fontFamily: f.display,
            fontWeight: '600',
            fontSize: Math.round(size / 3),
          }}
        >
          {children}
        </Text>
      </View>
    </View>
  );
}
