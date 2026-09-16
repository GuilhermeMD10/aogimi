import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Glass } from '@/shared/components/Glass';
import { Touchable } from '@/shared/components/Touchable';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
import type { WordResult } from '../types';
import { isEnglish, preferredHeadword } from '../lib/headword';
import { posLabel } from '../lib/posLabel';
import { MetaChip } from './MetaChip';
import { AddButton } from './AddButton';

/**
 * A word in the results list — DESIGN.md's "Dictionary result row": Tier 2
 * glass, radius 12, padding 14 × 16; 24/700 JP headword with the reading
 * beside it, the gloss, the JLPT and POS tags, and the 40px add circle.
 *
 * Every row is the same pane. What marks the ranked answer is `leading`: the
 * compositions draw the **first row's add circle in accent glass** and the
 * rest in Tier 1, so the list reads as one answer with alternates under it
 * without the rows themselves differing.
 *
 * Glosses join with "; " rather than stacking as a numbered list. A result row
 * answers "is this the word?", and the numbered breakdown belongs on the
 * entry, one tap away.
 */
export function ResultCard({
  word,
  query,
  leading = false,
  addLabel,
  onPress,
  onAdd,
}: {
  word: WordResult;
  query: string;
  /** The top-ranked result — its add circle takes accent glass. */
  leading?: boolean;
  addLabel: string;
  onPress: () => void;
  onAdd: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);

  const headword = preferredHeadword(word, query);
  // Only show a reading when the headword is a kanji form — for a kana entry
  // the reading *is* the headword and repeating it reads as a mistake.
  const reading = word.kanji.length > 0 ? word.readings[0]?.form ?? null : null;
  const gloss = word.meanings
    .filter((m) => isEnglish(m.lang))
    .slice(0, 3)
    .map((m) => m.meaning)
    .join('; ');
  const pos = posLabel(word.meanings[0]?.pos);

  return (
    // The row is far taller than the 44pt floor, and the pane draws the
    // surface — the press nudge is all `Touchable` adds here.
    <Touchable onPress={onPress} accessibilityRole="button" minTarget={false}>
      <Glass tier={2} radius={radius.control} style={styles.row}>
        <View style={styles.body}>
          <View style={styles.headRow}>
            <Text style={styles.headword} numberOfLines={1}>
              {headword}
            </Text>
            {reading !== null && (
              <Text style={styles.reading} numberOfLines={1}>
                {reading}
              </Text>
            )}
            {word.is_common && <View style={styles.commonDot} accessibilityLabel="Common word" />}
          </View>

          {gloss !== '' && (
            <Text style={styles.gloss} numberOfLines={2}>
              {gloss}
            </Text>
          )}

          {(word.jlpt_level != null || pos !== null) && (
            <View style={styles.chips}>
              {word.jlpt_level != null && <JlptChip level={word.jlpt_level} compact />}
              {pos !== null && <MetaChip label={pos} />}
            </View>
          )}
        </View>

        <AddButton onPress={onAdd} accessibilityLabel={addLabel} accent={leading} />
      </Glass>
    </Touchable>
  );
}

/** The composition's status dot beside a common word. A dot, by definition —
 *  half its own box, not a token radius. */
const DOT = 5;

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
        },
        body: { flex: 1, minWidth: 0, gap: spacing.xs },
        headRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        },
        headword: { ...type.titleKanji, color: p.ink, flexShrink: 1 },
        /** 14px JP in `muted` — the row's reading, per DESIGN.md. */
        reading: {
          fontFamily: type.titleReading.fontFamily,
          fontSize: 14,
          lineHeight: 20,
          color: p.muted,
          flexShrink: 1,
        },
        commonDot: {
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: p.accent,
        },
        gloss: { ...type.bodySm, color: p.ink },
        chips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
        },
      }),
    [p],
  );
}
