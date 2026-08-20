import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';
import type { RecentLookup } from '../lib/dictionaryStorage';
import { relativeAge } from '../lib/relativeAge';

/**
 * One row of RECENTLY LOOKED UP.
 *
 * Reads a **snapshot**, not an entry — the store copies headword, reading,
 * gloss and tier in at write time so this list costs no SQLite reads. Tapping
 * opens the entry by `wordId`, which is why the row can be certain it lands on
 * the word the user actually saw rather than on whatever a re-run search would
 * rank first today.
 *
 * **No add button**, unlike a result card: the snapshot has no meanings array,
 * so building a `CardDraft` here would need a lookup first, and an affordance
 * that sometimes stalls is worse than one that isn't there. Adding happens on
 * the entry, one tap away.
 *
 * `jlptLevel` predates nothing — rows written before the field existed arrive
 * `undefined` and simply draw no chip.
 */
export function RecentLookupRow({
  lookup,
  divider,
  onPress,
}: {
  lookup: RecentLookup;
  /** Hairline under the row. The list suppresses it on the last one. */
  divider: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  const age = relativeAge(lookup.at);
  const level = lookup.jlptLevel ?? null;

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      minTarget={false}
      style={[styles.row, divider && styles.divider]}
    >
      <View style={styles.body}>
        <View style={styles.headRow}>
          <Text style={styles.headword} numberOfLines={1}>
            {lookup.headword}
          </Text>
          {lookup.reading !== '' && (
            <Text style={styles.reading} numberOfLines={1}>
              {lookup.reading}
            </Text>
          )}
          {level !== null && <JlptChip level={level} compact />}
        </View>
        {lookup.gloss !== '' && (
          <Text style={styles.gloss} numberOfLines={1}>
            {lookup.gloss}
          </Text>
        )}
      </View>

      {age !== '' && <Text style={styles.age}>{age}</Text>}
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm + 2,
          paddingVertical: spacing.md + 1,
          paddingHorizontal: 2,
        },
        divider: { borderBottomWidth: 1, borderBottomColor: p.paperBd },

        body: { flex: 1, minWidth: 0 },
        headRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
        },
        headword: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.lg + 1,
          color: p.ink,
          flexShrink: 1,
        },
        // The mono face is Latin-only, so readings take `jp` at the size the
        // mono label would have occupied.
        reading: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xs - 1,
          color: p.muted,
          flexShrink: 1,
        },
        gloss: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm - 1,
          color: p.soft,
          marginTop: 3,
        },
        age: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs - 1.5,
          color: p.faint,
          marginTop: 4,
        },
      }),
    [p],
  );
}
