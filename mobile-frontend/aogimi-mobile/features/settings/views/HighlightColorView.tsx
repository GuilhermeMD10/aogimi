import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable, Screen, BackBar } from '@/shared/components';
import Feather from '@expo/vector-icons/Feather';
import { useColors, fontFamily, fontSize, spacing } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import { useReaderPrefs, HIGHLIGHT_COLORS, type HighlightColor } from '@/features/books/reader/lib';

// Which colour the reader's text-selection band paints.
//
// Deliberately the same shape as `AppearanceView`: a pushed page of flat rows
// with a checkmark on the active one, no `router.back()` on select so the
// choice can be compared in place. Two settings that do the same kind of thing
// should not look like two different features.
//
// It writes through `useReaderPrefs`, the same app-level store the reader's own
// 設定 pane uses, so the choice applies to every book and lands live in an open
// reader (the style effect there re-sends it over the bridge).
//
// **Each row previews the band over real text rather than showing a swatch.**
// Every value is translucent by design, so a solid dot would misrepresent all
// five — what the reader is choosing is how words look underneath, and the row
// is the only honest place to show that.

const ORDER: HighlightColor[] = ['blue', 'green', 'yellow', 'pink', 'grey'];

const SAMPLE = '本を読む';

export function HighlightColorView() {
  const c = useColors();
  const t = useT();
  const { prefs, savePrefs, hydrated } = useReaderPrefs();

  return (
    <Screen padded>
      <BackBar title={t('highlight.title')} />

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={[styles.intro, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
          {t('highlight.intro')}
        </Text>

        {ORDER.map((key, i) => {
          // Until prefs hydrate, no row is marked — better than flashing the
          // default on and then correcting it a frame later.
          const active = hydrated && prefs.highlight === key;
          return (
            <Touchable
              minTarget={false}
              key={key}
              onPress={() => savePrefs({ highlight: key })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.row,
                {
                  borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: c.border,
                },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: c.fg }]}>
                  {t(`highlight.${key}`)}
                </Text>
                <View style={styles.sampleWrap}>
                  <Text
                    style={[
                      styles.sample,
                      {
                        color: c.fg,
                        backgroundColor: HIGHLIGHT_COLORS[key],
                        fontFamily: fontFamily.jp,
                      },
                    ]}
                  >
                    {SAMPLE}
                  </Text>
                </View>
              </View>
              {active && <Feather name="check" size={18} color={c.fg} />}
            </Touchable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl },
  intro: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: 18,
    paddingBottom: spacing.md,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: fontSize.md },
  // The band has to hug the glyphs to read as a selection, so the preview is
  // an inline-shrunk Text rather than a filled row.
  sampleWrap: { flexDirection: 'row', marginTop: 6 },
  sample: { fontSize: fontSize.md },
});
