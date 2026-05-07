import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import type { WordResult } from '@/lib/types';
import { JlptChip } from '@/components/ui/JlptChip';

type Props = {
  word: WordResult;
  query: string;
  onPress: () => void;
};

export function DictResultRow({ word, query, onPress }: Props) {
  const c = useColors();
  const headword = word.kanji[0] ?? word.readings[0] ?? '';
  const reading = word.readings[0] ?? '';
  const gloss = word.meanings.find((m) => m.lang === 'eng' || m.lang === 'en')?.meaning ?? '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? c.bgSunken : c.bgElev,
          borderColor: c.border,
        },
      ]}
    >
      <View style={styles.headRow}>
        <Text style={[styles.headword, { color: c.fg }]} numberOfLines={1}>
          {highlightMatch(headword, query, c.accent)}
        </Text>
        {reading && reading !== headword && (
          <Text style={[styles.reading, { color: c.fgMuted }]} numberOfLines={1}>
            {highlightMatch(reading, query, c.accent)}
          </Text>
        )}
        {word.jlpt_level != null && <JlptChip level={word.jlpt_level} compact />}
      </View>
      {gloss && (
        <Text style={[styles.gloss, { color: c.fgMuted }]} numberOfLines={2}>
          {gloss}
        </Text>
      )}
    </Pressable>
  );
}

function highlightMatch(text: string, query: string, accent: string): React.ReactNode {
  if (!query) return text;
  const idx = text.indexOf(query);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={{ color: accent }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' },
  headword: { fontFamily: fontFamily.jp, fontSize: fontSize.xl, fontWeight: '500' },
  reading: { fontFamily: fontFamily.jp, fontSize: fontSize.md },
  gloss: { fontSize: fontSize.sm, marginTop: 4, lineHeight: 18 },
});
