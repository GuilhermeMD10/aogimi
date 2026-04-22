import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { KanjiInfo, WordResult } from '@/lib/types';

type Props = {
  word: WordResult;
  kanjis?: KanjiInfo[];
  compact?: boolean;
};

export function DictEntry({ word, kanjis = [], compact }: Props) {
  const c = useColors();
  const headword = word.kanji[0] ?? word.readings[0] ?? '';
  const reading = word.readings[0] ?? '';
  const englishMeanings = word.meanings
    .filter((m) => m.lang === 'eng' || m.lang === 'en')
    .slice(0, compact ? 3 : 8);

  return (
    <View style={styles.root}>
      <View style={styles.headRow}>
        <Text style={[styles.headword, { color: c.fg }]} numberOfLines={1}>
          {headword}
        </Text>
        {reading && reading !== headword && (
          <Text style={[styles.reading, { color: c.fgMuted }]} numberOfLines={1}>
            {reading}
          </Text>
        )}
      </View>

      {englishMeanings.length > 0 && (
        <View style={styles.meanings}>
          {englishMeanings.map((m, i) => (
            <View key={i} style={styles.meaningRow}>
              <Text style={[styles.meaningNum, { color: c.fgSubtle }]}>{i + 1}.</Text>
              <Text style={[styles.meaningText, { color: c.fg }]}>
                {m.meaning}
                {m.pos && (
                  <Text style={[styles.pos, { color: c.fgMuted }]}> · {m.pos}</Text>
                )}
              </Text>
            </View>
          ))}
        </View>
      )}

      {kanjis.length > 0 && (
        <View style={styles.kanjiRow}>
          {kanjis.map((k) => (
            <KanjiCard key={k.literal} kanji={k} />
          ))}
        </View>
      )}
    </View>
  );
}

function KanjiCard({ kanji }: { kanji: KanjiInfo }) {
  const c = useColors();
  return (
    <View style={[styles.kanjiCard, { backgroundColor: c.bgSunken, borderColor: c.border }]}>
      <Text style={[styles.kanjiChar, { color: c.fg }]}>{kanji.literal}</Text>
      {kanji.on_readings.length > 0 && (
        <Text style={[styles.kanjiReading, { color: c.fgMuted }]} numberOfLines={1}>
          音 {kanji.on_readings.slice(0, 3).join('、')}
        </Text>
      )}
      {kanji.kun_readings.length > 0 && (
        <Text style={[styles.kanjiReading, { color: c.fgMuted }]} numberOfLines={1}>
          訓 {kanji.kun_readings.slice(0, 3).join('、')}
        </Text>
      )}
      {kanji.meanings.length > 0 && (
        <Text style={[styles.kanjiMeaning, { color: c.fgSubtle }]} numberOfLines={2}>
          {kanji.meanings.slice(0, 3).join(', ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' },
  headword: { fontFamily: fontFamily.jp, fontSize: 40, fontWeight: '500', letterSpacing: -0.5 },
  reading: { fontFamily: fontFamily.jp, fontSize: fontSize.lg },
  meanings: { gap: 6 },
  meaningRow: { flexDirection: 'row', gap: spacing.sm },
  meaningNum: {
    fontSize: fontSize.sm,
    fontVariant: ['tabular-nums'],
    minWidth: 18,
  },
  meaningText: { fontSize: fontSize.md, flex: 1, lineHeight: 22 },
  pos: { fontSize: fontSize.sm },
  kanjiRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  kanjiCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minWidth: 120,
    gap: 4,
  },
  kanjiChar: { fontFamily: fontFamily.jp, fontSize: 32, fontWeight: '500' },
  kanjiReading: { fontSize: fontSize.xs, fontFamily: fontFamily.jp },
  kanjiMeaning: { fontSize: fontSize.xs, marginTop: 2 },
});
