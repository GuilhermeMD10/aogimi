import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { KanjiInfo, WordResult } from '@/lib/types';
import { JlptChip } from '@/components/ui/JlptChip';

type Props = {
  word: WordResult;
  kanjis?: KanjiInfo[];
  compact?: boolean;
  /** When provided, each kanji card becomes pressable and fires this with
   *  the kanji's literal — the parent typically opens a fresh dictionary
   *  search for that character (drill-down). */
  onKanjiPress?: (literal: string) => void;
};

export function DictEntry({ word, kanjis = [], compact, onKanjiPress }: Props) {
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
        {word.jlpt_level != null && <JlptChip level={word.jlpt_level} />}
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
            <KanjiCard
              key={k.literal}
              kanji={k}
              onPress={onKanjiPress ? () => onKanjiPress(k.literal) : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function KanjiCard({
  kanji,
  onPress,
}: {
  kanji: KanjiInfo;
  onPress?: () => void;
}) {
  const c = useColors();
  const body = (
    <>
      <View style={styles.kanjiHeader}>
        <Text style={[styles.kanjiChar, { color: c.fg }]}>{kanji.literal}</Text>
        {kanji.jlpt_level != null && <JlptChip level={kanji.jlpt_level} compact />}
      </View>
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
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.kanjiCard, { backgroundColor: c.bgSunken, borderColor: c.border }]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Search ${kanji.literal}`}
      style={({ pressed }) => [
        styles.kanjiCard,
        {
          backgroundColor: pressed ? c.bgElev : c.bgSunken,
          borderColor: c.border,
        },
      ]}
    >
      {body}
    </Pressable>
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
  kanjiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kanjiChar: { fontFamily: fontFamily.jp, fontSize: 32, fontWeight: '500' },
  kanjiReading: { fontSize: fontSize.xs, fontFamily: fontFamily.jp },
  kanjiMeaning: { fontSize: fontSize.xs, marginTop: 2 },
});
