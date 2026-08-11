import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';
import { parseRuby } from '@/lib/ruby';

/**
 * Renders Japanese text with furigana annotations above any kanji segments.
 * React Native has no native `<ruby>` element, so each segment becomes a
 * column with the furigana stacked over the base. Non-ruby runs render as
 * plain inline text.
 *
 * `html` is the raw `<ruby>` markup from Kanjium's sentences.txt; the parser
 * lives in `lib/ruby.ts` and is shared.
 */
export function RubyText({
  html,
  fallback,
  fontSize = 17,
  furiganaSize = 10,
  color,
}: {
  html: string | null | undefined;
  /** Plain Japanese to render when `html` is null/empty. */
  fallback?: string;
  fontSize?: number;
  furiganaSize?: number;
  color?: string;
}) {
  const c = useColors();
  const fg = color ?? c.fg;
  const segments = parseRuby(html);

  if (segments.length === 0 && fallback) {
    return (
      <Text
        style={{
          color: fg,
          fontSize,
          lineHeight: fontSize + furiganaSize + 6,
          fontFamily: fontFamily.jp,
        }}
      >
        {fallback}
      </Text>
    );
  }

  const lineHeight = fontSize + furiganaSize + 6;

  return (
    <View style={[styles.row, { minHeight: lineHeight }]}>
      {segments.map((seg, idx) => (
        <View key={idx} style={styles.cell}>
          <Text
            allowFontScaling={false}
            style={{
              color: fg,
              opacity: 0.65,
              fontSize: furiganaSize,
              lineHeight: furiganaSize + 2,
              fontFamily: fontFamily.jp,
              height: seg.furigana ? furiganaSize + 2 : 0,
            }}
          >
            {seg.furigana ?? ''}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              color: fg,
              fontSize,
              lineHeight: fontSize + 4,
              fontFamily: fontFamily.jp,
            }}
          >
            {seg.base}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  cell: {
    flexDirection: 'column',
    alignItems: 'center',
  },
});
