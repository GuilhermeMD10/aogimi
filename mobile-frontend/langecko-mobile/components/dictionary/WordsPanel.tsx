import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { WordResult } from '@/lib/types';

const MAX_WORDS = 15;

interface WordsPanelProps {
  words: WordResult[];
  /** Invoked when a word row is tapped. Callers wire this to whatever
   *  navigation makes sense (drawer push, stack route, deep link). */
  onWordPress: (id: number) => void;
}

export const WordsPanel = memo(function WordsPanel({ words, onWordPress }: WordsPanelProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const shown = words.slice(0, MAX_WORDS);

  return (
    <Card style={styles.card}>
      <Text style={styles.heading}>Words ({words.length})</Text>

      <View style={styles.list}>
        {shown.map((w, i) => (
          <WordRow
            key={w.id}
            word={w}
            isLast={i === shown.length - 1}
            onPress={onWordPress}
            styles={styles}
            rippleColor={colors.border}
          />
        ))}
      </View>

      {words.length > MAX_WORDS ? (
        <Text style={styles.footnote}>
          Showing first {MAX_WORDS} of {words.length} results.
        </Text>
      ) : null}
    </Card>
  );
});

interface WordRowProps {
  word: WordResult;
  isLast: boolean;
  onPress: (id: number) => void;
  styles: ReturnType<typeof createStyles>;
  rippleColor: string;
}

const WordRow = memo(function WordRow({ word, isLast, onPress, styles, rippleColor }: WordRowProps) {
  const handlePress = useCallback(() => onPress(word.id), [onPress, word.id]);
  const headword = word.kanji[0] ?? word.readings[0] ?? '—';
  const reading  = word.kanji.length > 0 ? word.readings[0] : null;
  const glosses  = word.meanings
    .filter((m) => m.lang === 'eng')
    .map((m) => m.meaning)
    .join(' · ');
  const pos = word.meanings[0]?.pos;
  const showCharGrades = word.char_grades?.length > 1;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${headword}`}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.headword}>{headword}</Text>
        {reading ? <Text style={styles.reading}>{reading}</Text> : null}
        {word.grade != null ? <Text style={styles.grade}>G{word.grade}</Text> : null}
        {word.is_common ? <Text style={styles.common}>common</Text> : null}
      </View>

      {pos ? <Text style={styles.pos}>{pos}</Text> : null}

      <Text style={styles.glosses}>{glosses || '—'}</Text>

      {showCharGrades ? (
        <View style={styles.chipRow}>
          {word.char_grades.map(({ char, grade }) => (
            <View key={char} style={styles.chip}>
              <Text style={styles.chipChar}>{char}</Text>
              <Text style={styles.chipGrade}>{grade != null ? `G${grade}` : '—'}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
});

const createStyles = (c: Colors) => StyleSheet.create({
  card: { marginTop: spacing.md },
  heading: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },

  row: { paddingVertical: spacing.sm },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowPressed: { opacity: 0.6 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  headword: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: c.textPrimary,
  },
  reading: { fontSize: fontSize.xs, color: c.textSecondary },
  grade:   { fontSize: fontSize.xs, color: c.textSecondary },
  common:  { marginLeft: 'auto', fontSize: fontSize.xs, color: c.accentDark },
  pos: {
    fontSize: fontSize.xs,
    color: c.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  glosses: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginTop: 2,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipChar:  { fontSize: fontSize.xs, color: c.textPrimary, fontWeight: '500' },
  chipGrade: { fontSize: fontSize.xs, color: c.textSecondary, opacity: 0.7 },

  footnote: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
});
