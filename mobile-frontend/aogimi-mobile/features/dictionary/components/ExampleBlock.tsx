import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RubyText } from '@/shared/components/RubyText';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import type { ExampleSentence } from '../types';

/**
 * One example sentence and its translation, separated from the next by a
 * hairline — the EXAMPLE block.
 *
 * Up to five are rendered (`SENTENCE_LIMIT` in `localDict.ts`) because they
 * are already fetched with the entry and a second example is often the one
 * that lands. Furigana comes from `RubyText`; the headword is deliberately not
 * bolded inside the sentence — the ruby annotations already sit above the
 * kanji and a bold run underneath them makes a busy line.
 */
export function ExampleBlock({
  sentence,
  divider,
  compact = false,
}: {
  sentence: ExampleSentence;
  /** Hairline above the sentence. The list omits it on the first. */
  divider: boolean;
  compact?: boolean;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={[styles.block, divider && styles.divider]}>
      <RubyText
        html={sentence.jaRuby}
        fallback={sentence.ja}
        color={p.ink}
        fontSize={compact ? 14 : 15}
      />
      <Text style={styles.translation}>{sentence.en}</Text>
      {sentence.gradeLabel !== null && <Text style={styles.grade}>{sentence.gradeLabel}</Text>}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        block: { paddingVertical: spacing.md },
        /** `bdB` — the weak edge, a divider inside one surface. */
        divider: { borderTopWidth: 1, borderTopColor: p.bdB },
        translation: { ...type.bodySm, color: p.muted, marginTop: spacing.xs },
        grade: {
          ...type.monoMeta,
          textTransform: 'uppercase',
          color: p.faint,
          marginTop: spacing.xs,
        },
      }),
    [p],
  );
}
