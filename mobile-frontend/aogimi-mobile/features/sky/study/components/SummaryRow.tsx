import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InnerPlate } from '@/shared/components/Card';
import { usePalette } from '@/theme/ThemeContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import type { CardRecord } from '../../stage/types';

/**
 * One card on the summary — `Study.dc.html`'s list row, shared by the hardest
 * list and the tier-upgrade list because the compositions draw the same row
 * twice: a Tier 1 plate with the headword and its reading on a shared
 * baseline at the left, and whatever that section has to say about the card
 * at the right.
 *
 * The `right` slot is a node rather than a variant prop: one list puts a
 * count chip there and the other a pair of state tags with an arrow between
 * them, and those have nothing in common but their position.
 */
export function SummaryRow({ card, right }: { card: CardRecord; right: React.ReactNode }) {
  const p = usePalette();
  const s = useStyles(p);
  return (
    <InnerPlate style={s.row}>
      <View style={s.line}>
        <Text style={s.front} numberOfLines={1}>
          {card.front}
        </Text>
        {card.reading.length > 0 && (
          <Text style={s.reading} numberOfLines={1}>
            {card.reading}
          </Text>
        )}
      </View>
      {right}
    </InnerPlate>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.md,
        },
        /** Baseline, so the 18pt kanji and the 13pt kana sit on one line. */
        line: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
          flexShrink: 1,
          minWidth: 0,
        },
        /** 18/700 JP — the composition's row headword, `titleKanji`'s face at
         *  the smaller of its two sizes. */
        front: { ...type.titleKanji, fontSize: 18, lineHeight: 24, color: p.ink, flexShrink: 1 },
        reading: { ...type.titleReading, fontSize: 13, lineHeight: 18, color: p.muted, flexShrink: 1 },
      }),
    [p],
  );
}
