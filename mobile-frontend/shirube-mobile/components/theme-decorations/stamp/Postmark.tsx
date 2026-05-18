import { Text, View, type ViewStyle } from 'react-native';
import { useColors, useFonts } from '@/theme/ThemeContext';

type Props = {
  topLabel?: string;
  centerLabel?: string;
  bottomLabel?: string;
  size?: number;
  rotate?: number;
  style?: ViewStyle;
};

/**
 * Stamp-theme decoration: concentric-ring postmark. Vermillion ring with
 * an inset paper gap, stacked labels, slightly rotated.
 *
 * Used as ceremonial reward (welcome screen, study correct, library
 * milestone) — never as ambient decoration.
 */
export function Postmark({
  topLabel = 'NIPPON',
  centerLabel = '語境',
  bottomLabel = 'YŪBIN',
  size = 90,
  rotate = -8,
  style,
}: Props) {
  const c = useColors();
  const f = useFonts();

  const ringWidth = 5;
  const innerSize = size - ringWidth * 2;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${rotate}deg` }],
          opacity: 0.9,
        },
        style,
      ]}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: c.bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: c.accent,
        }}
      >
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.mono,
            fontSize: Math.max(9, Math.round(size * 0.1)),
            letterSpacing: 1.6,
            color: c.accent,
            fontWeight: '500',
          }}
        >
          {topLabel}
        </Text>
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.display,
            fontSize: Math.round(size * 0.2),
            color: c.accent,
            fontWeight: '700',
            letterSpacing: 1,
            marginTop: 2,
            marginBottom: 2,
          }}
        >
          {centerLabel}
        </Text>
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.mono,
            fontSize: Math.max(8, Math.round(size * 0.09)),
            letterSpacing: 1.6,
            color: c.accent,
            fontWeight: '500',
          }}
        >
          {bottomLabel}
        </Text>
      </View>
    </View>
  );
}

