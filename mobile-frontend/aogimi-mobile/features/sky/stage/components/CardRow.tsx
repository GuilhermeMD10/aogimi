import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Glass, IconButton, StateTag, Touchable } from '@/shared/components';
import { usePalette, radius, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import type { LocalCard } from '../types';
import { CardInspectorBody, rankOfCard } from './CardInspectorBody';

/** `SkyCardsList.dc.html`'s row: 52pt, radius 12, the headword at 20px. */
const ROW_H = 52;

/**
 * One card in the deck's list — `SkyCardsList.dc.html`'s row, which **opens in
 * place**. Collapsed it is the headword and a state tag; tapped, it grows to
 * show what the star inspector shows (`CardInspectorBody`, the same component)
 * with the dictionary and `…` under it.
 *
 * The tag says `DUE NOW` in `accentDeep` when the card is due, because on a list
 * whose purpose is *what should I do*, due-ness outranks rank; otherwise it is
 * the displayed rank in the sky's own colour.
 */
export function CardRow({
  card,
  due,
  expanded,
  onToggle,
  onMore,
  onLookUp,
}: Readonly<{
  card: LocalCard;
  due: boolean;
  expanded: boolean;
  onToggle: () => void;
  onMore: () => void;
  onLookUp: () => void;
}>) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const { rank, color } = rankOfCard(card);

  return (
    <Glass tier={2} radius={radius.control} style={s.row}>
      <Touchable
        onPress={onToggle}
        minTarget={false}
        accessibilityRole="button"
        accessibilityLabel={card.front}
        accessibilityState={{ expanded }}
        style={s.head}
      >
        <Text style={s.front} numberOfLines={1}>
          {card.front}
        </Text>
        {due ? (
          <StateTag label={t('sky.dueNow')} tone={p.accentDeep} />
        ) : (
          <StateTag label={t(`sky.rank.${rank}`)} tone={color} />
        )}
      </Touchable>

      {expanded && (
        <View style={s.detail}>
          <CardInspectorBody card={card} showFront={false} />
          <View style={s.actions}>
            <IconButton icon="book-open" size={36} onPress={onLookUp} accessibilityLabel={t('sky.lookUp')} />
            <IconButton glyph="more" size={36} onPress={onMore} accessibilityLabel={t('sky.cardMenu')} />
          </View>
        </View>
      )}
    </Glass>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: { overflow: 'visible' },
        head: {
          minHeight: ROW_H,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        front: {
          ...type.titleReading,
          fontFamily: type.displayKanji.fontFamily,
          fontSize: 20,
          lineHeight: 28,
          color: p.ink,
          flexShrink: 1,
        },
        detail: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg,
          gap: spacing.md,
          borderTopWidth: 1,
          borderTopColor: p.bdB,
          paddingTop: spacing.md,
        },
        actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
      }),
    [p],
  );
}
