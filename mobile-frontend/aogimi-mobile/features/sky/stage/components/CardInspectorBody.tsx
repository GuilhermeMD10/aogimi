import { Fragment, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RANK_COLORS } from '@/features/sky/map/lib/palette';
import { JlptChip } from '@/shared/components/JlptChip';
import { MeaningRow } from '@/shared/components/MeaningRow';
import { StateTag } from '@/shared/components/StateTag';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';
import { shownRank } from '../../lib/skyProjection';
import { MIX_ORDER } from '../lib/masteryMix';
import type { LocalCard } from '../types';

/**
 * The rank a card's star is *drawn* as, with the colour to match — the
 * `shownRank` → `MIX_ORDER` index → `RANK_COLORS` chain that every piece of
 * card chrome walks, in one place so a tag and its star can never disagree.
 */
export function rankOfCard(card: LocalCard): { rank: LocalCard['state']; color: string } {
  const rank = shownRank(card);
  return { rank, color: RANK_COLORS[MIX_ORDER.indexOf(rank)] ?? RANK_COLORS[0] };
}

/** JLPT chip + state line — the inspector's first row, minus its actions. */
export function CardTags({ card }: { card: LocalCard }) {
  const t = useT();
  const { rank, color } = rankOfCard(card);
  return (
    <View style={styles.tags}>
      {card.jlpt_level !== null && <JlptChip level={card.jlpt_level} />}
      <StateTag label={t(`sky.rank.${rank}`)} tone={color} size="md" />
    </View>
  );
}

/**
 * What a card says about itself — `SkyInspector.dc.html`'s content, shared by
 * the star inspector drawer and the cards list's expanded row so the two can
 * never drift: headword, `[reading]` in accent with the review count opposite,
 * the numbered meanings, the sentence it came from with the word lit inside it,
 * and any notes.
 *
 * Deliberately absent, as before:
 *   - **part of speech** — nothing on a `cards` row records one;
 *   - **an example translation** — `context_sentence` stores the sentence alone;
 *   - **the interval sparkline** — there is no per-card review history on the
 *     client to draw it from.
 *
 * `showFront` is off in the list, where the row's own title is already the
 * headword.
 */
export function CardInspectorBody({ card, showFront = true }: { card: LocalCard; showFront?: boolean }) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);

  // Cards created before migration 026 carry their glosses inside `back`
  // instead, which is why this falls back rather than showing an empty block.
  const meanings = card.meanings.length > 0 ? card.meanings : null;

  // The sentence with every occurrence of the headword lit. Split on the exact
  // surface string the card carries — for a reader-made card that is what was
  // highlighted, so it is in the sentence by construction.
  const context = card.context_sentence;
  const parts = context.length > 0 && card.front.length > 0 ? context.split(card.front) : [context];

  return (
    <View style={s.body}>
      {showFront && (
        <Text style={s.front} numberOfLines={2}>
          {card.front}
        </Text>
      )}

      <View style={s.readingRow}>
        {card.reading.length > 0 ? (
          <Text style={s.reading} numberOfLines={1}>
            {`[${card.reading}]`}
          </Text>
        ) : (
          <View />
        )}
        <Text style={s.reviews}>{t('sky.reviews', { count: card.reviewed_times.toLocaleString() })}</Text>
      </View>

      {meanings ? (
        <View style={s.meanings}>
          {meanings.map((m, i) => (
            <MeaningRow key={`${m}-${i}`} index={i + 1} text={m} />
          ))}
        </View>
      ) : (
        card.back.length > 0 && <Text style={s.back}>{card.back}</Text>
      )}

      {context.length > 0 && (
        <Text style={s.context}>
          {parts.map((part, i) => (
            <Fragment key={i}>
              {part}
              {i < parts.length - 1 && <Text style={s.highlight}>{card.front}</Text>}
            </Fragment>
          ))}
        </Text>
      )}

      {card.notes.length > 0 && <Text style={s.notes}>{card.notes}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        body: { gap: spacing.md },
        /** 32/700 JP — the composition's headword. */
        front: { ...type.titleKanji, fontSize: 32, lineHeight: 40, color: p.ink },
        readingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
        reading: { ...type.titleReading, fontSize: 15, lineHeight: 22, color: p.accent, flexShrink: 1 },
        reviews: { ...type.monoMeta, color: p.faint, fontVariant: ['tabular-nums'] },
        meanings: { gap: 6 },
        back: { ...type.bodySm, fontSize: 14, lineHeight: 20, color: p.ink },
        context: {
          ...type.titleReading,
          fontSize: 14,
          lineHeight: 24,
          color: p.ink,
        },
        highlight: { backgroundColor: p.glassAccent, borderRadius: radius.chip },
        notes: { ...type.caption, color: p.faint, lineHeight: 18 },
      }),
    [p],
  );
}
