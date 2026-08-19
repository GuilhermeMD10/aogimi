import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import type { WordResult } from '../types';
import { isEnglish, preferredHeadword } from '../lib/headword';
import { posLabel } from '../lib/posLabel';
import { MetaChip } from './MetaChip';
import { AddButton } from './AddButton';

/**
 * A word in the results list.
 *
 * **Only the first card is a card.** The handoff fills and outlines the top
 * result and leaves the rest as bare rows on the canvas — the list reads as one
 * answer with alternates under it, which is what a ranked dictionary result set
 * is. `elevated` carries that, and also tints the headword `accent`.
 *
 * Glosses join with "; " rather than stacking as a numbered list (which is what
 * the old row did). A result row answers "is this the word?", and the numbered
 * breakdown belongs on the entry, one tap away.
 */
export function ResultCard({
  word,
  query,
  elevated = false,
  compact = false,
  addLabel,
  onPress,
  onAdd,
}: {
  word: WordResult;
  query: string;
  elevated?: boolean;
  /** The reader drawer's step-down. */
  compact?: boolean;
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.card, compact && styles.cardCompact, elevated && styles.elevated]}
    >
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text
            style={[
              styles.headword,
              compact && styles.headwordCompact,
              elevated && styles.headwordElevated,
            ]}
            numberOfLines={1}
          >
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
          <Text style={styles.gloss} numberOfLines={compact ? 1 : 2}>
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

      <AddButton onPress={onAdd} accessibilityLabel={addLabel} size={compact ? 30 : 32} />
    </Pressable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md - 2,
          padding: spacing.md + 1,
          borderRadius: radius.md,
          // Transparent by default: the plain rows have no fill and no edge, so
          // a border here would draw a box the design does not have.
          borderWidth: 1,
          borderColor: 'transparent',
        },
        cardCompact: { padding: spacing.sm + 2, gap: spacing.sm },
        elevated: {
          backgroundColor: p.paper,
          borderColor: p.bdA,
        },

        body: { flex: 1, minWidth: 0 },
        headRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        },
        headword: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xl,
          fontWeight: '500',
          color: p.ink,
          flexShrink: 1,
        },
        headwordCompact: { fontSize: fontSize.lg + 1 },
        headwordElevated: { color: p.accent },
        // The handoff sets kana in its mono face. Ours is Switzer, which has no
        // Japanese glyphs and would fall back mid-string, so readings take `jp`
        // at the size the mono label would have occupied.
        reading: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xs,
          color: p.muted,
          flexShrink: 1,
        },
        commonDot: {
          width: 5,
          height: 5,
          borderRadius: radius.pill,
          backgroundColor: p.accent,
        },

        gloss: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm - 1,
          lineHeight: 17,
          color: p.soft,
          marginTop: spacing.xs,
        },
        chips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          marginTop: spacing.sm,
        },
      }),
    [p],
  );
}
