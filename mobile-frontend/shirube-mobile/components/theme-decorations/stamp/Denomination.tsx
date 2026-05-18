import { Text, View, type ViewStyle } from 'react-native';
import { useColors, useFonts } from '@/theme/ThemeContext';

type Props = {
  /** Big stamp value, e.g. "20", "30". JLPT tier maps to denomination:
   *  N1=30 · N2=20 · N3=15 · N4–5=10 · daily/all=05. */
  value: string;
  /** Smaller line under it — typically a year or unit, e.g. "2017" or "JPY". */
  caption?: string;
  /** Display size: sm = 14, md = 22, lg = 28. */
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
};

const SIZE_MAP: Record<NonNullable<Props['size']>, number> = {
  sm: 14,
  md: 22,
  lg: 28,
};

/**
 * Stamp-theme decoration: postage denomination block — vermillion serif
 * numerals over a small mono caption. Drops in the corner of book / deck
 * cards.
 */
export function Denomination({ value, caption, size = 'md', style }: Props) {
  const c = useColors();
  const f = useFonts();
  const valueSize = SIZE_MAP[size];

  return (
    <View style={[{ alignItems: 'flex-start' }, style]}>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: f.displayBold,
          fontWeight: '700',
          fontSize: valueSize,
          color: c.accent,
          lineHeight: valueSize,
        }}
      >
        {value}
      </Text>
      {caption ? (
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: f.mono,
            fontSize: 9,
            letterSpacing: 1.8,
            color: c.fgSubtle,
            marginTop: 2,
          }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
