import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Touchable } from '@/shared/components/Touchable';
import { JlptChip } from '@/shared/components/JlptChip';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import type { RecentLookup } from '../lib/dictionaryStorage';
import { relativeAge } from '../lib/relativeAge';

/**
 * One card of RECENTLY LOOKED UP — `DictionarySearch.dc.html`'s row: a Tier 2
 * card, 20/700 JP headword with the reading and JLPT chip beside it, the gloss
 * under, and the time-ago at the trailing edge.
 *
 * Reads a **snapshot**, not an entry — the store copies headword, reading,
 * gloss and tier in at write time so this list costs no SQLite reads. Tapping
 * opens the entry by `wordId`, which is why the row can be certain it lands on
 * the word the user actually saw rather than on whatever a re-run search would
 * rank first today.
 *
 * **No add circle**, although the composition draws one: the snapshot has no
 * meanings array, so building a `CardDraft` here would need a lookup first,
 * and an affordance that sometimes stalls is worse than one that isn't there.
 * Adding happens on the entry, one tap away. The slot carries the age instead,
 * which DESIGN.md's row puts there.
 *
 * `jlptLevel` predates nothing — rows written before the field existed arrive
 * `undefined` and simply draw no chip.
 */
export function RecentLookupRow({
  lookup,
  onPress,
}: {
  lookup: RecentLookup;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  const age = relativeAge(lookup.at);
  const level = lookup.jlptLevel ?? null;

  return (
    <Touchable onPress={onPress} accessibilityRole="button" minTarget={false}>
      <Card padded={false} style={styles.row}>
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
      </Card>
    </Touchable>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        /** The composition's 14 × 16, tighter than the card's default 16. */
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
        },
        body: { flex: 1, minWidth: 0, gap: 5 },
        headRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        /** 20/700 JP — between `titleKanji` (24) and the reading; the bold cut
         *  is borrowed from the former. */
        headword: {
          fontFamily: type.titleKanji.fontFamily,
          fontSize: 20,
          fontWeight: '700',
          lineHeight: 26,
          color: p.ink,
          flexShrink: 1,
        },
        reading: {
          fontFamily: type.titleReading.fontFamily,
          fontSize: 13,
          lineHeight: 18,
          color: p.faint,
          flexShrink: 1,
        },
        gloss: { ...type.bodySm, color: p.muted },
        /** DESIGN.md's row: "time-ago 13px ink-muted". */
        age: { ...type.bodySm, color: p.muted },
      }),
    [p],
  );
}
