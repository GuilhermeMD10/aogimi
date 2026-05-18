import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useColors, useFonts } from '@/theme/ThemeContext';

type Props = {
  children: string;
  size?: number;
  rotate?: number;
  /** When true: paper fill + vermillion text (used on red surfaces). */
  inverted?: boolean;
  style?: ViewStyle;
};

/**
 * Stamp-theme decoration: a hanko-style seal stamp. Vermillion square with
 * an inset paper border + slight rotation so it reads as hand-pressed.
 *
 * Reserved for state, never decoration: 読 currently-reading · 急 urgent ·
 * 印 saved · 正解 correct · 新 new.
 */
export function HankoSeal({
  children,
  size = 56,
  rotate = -3,
  inverted = false,
  style,
}: Props) {
  const c = useColors();
  const f = useFonts();

  const bg = inverted ? c.bg : c.accent;
  const fg = inverted ? c.accent : c.accentFg;
  const ringColor = inverted ? c.accent : c.bg;

  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderColor: ringColor,
          transform: [{ rotate: `${rotate}deg` }],
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          color: fg,
          fontFamily: f.display,
          fontWeight: '700',
          fontSize: Math.round(size * 0.5),
          letterSpacing: 0.5,
          lineHeight: Math.round(size * 0.5),
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    // 2px inset paper ring per the Stamp DS — RN renders this via borderWidth.
    borderWidth: 2,
    borderRadius: 0,
  },
});
