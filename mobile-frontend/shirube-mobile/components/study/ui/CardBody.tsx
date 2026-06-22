import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import type { CardRecord } from '../../decks/types';
import type { DisplayPrefs } from '../types';
import { cloze } from '../utils/clozeContext';

type Props = {
  card: CardRecord;
  prefs: DisplayPrefs;
  deckName: string;
  side: 'front' | 'back';
};

// Renders the card's visible content according to side + display
// prefs. One component instead of two (CardFront/CardBack) because
// the context-sentence slot reads the same field on both sides — just
// clozed on the front, un-clozed on the back. Splitting into two
// components would duplicate the slot or coordinate via the parent.
//
// Production preset reverses orientation: meaning on the front, kanji
// + reading on the back. Front-side toggles other than `deckName`
// don't apply in production (reading + cloze make no sense when the
// front is the meaning).
export function CardBody({ card, prefs, deckName, side }: Props) {
  const c = useColors();
  const isProduction = prefs.preset === 'production';
  const isFront = side === 'front';

  if (isProduction) {
    return (
      <View style={styles.body}>
        {prefs.front.deckName && deckName.length > 0 && isFront && (
          <Text style={[styles.deckLabel, { color: c.fgSubtle }]}>{deckName}</Text>
        )}
        {isFront ? (
          <Text style={[styles.meaning, { color: c.fg }]}>{card.back}</Text>
        ) : (
          <>
            <Text style={[styles.kanji, { color: c.fg }]}>{card.front}</Text>
            {card.reading.length > 0 && (
              <Text style={[styles.reading, { color: c.fgMuted }]}>{card.reading}</Text>
            )}
            {prefs.back.exampleSentence && card.context_sentence.length > 0 && (
              <Text style={[styles.contextRevealed, { color: c.fg }]}>
                {card.context_sentence}
              </Text>
            )}
          </>
        )}
      </View>
    );
  }

  // Non-production: kanji always on front, meaning revealed on back.
  // Context lives in a single slot — clozed when on front, full text
  // when on back.
  const showContextOnFront = isFront && prefs.front.context && card.context_sentence.length > 0;
  const showContextOnBack  = !isFront && prefs.back.exampleSentence && card.context_sentence.length > 0;

  return (
    <View style={styles.body}>
      {prefs.front.deckName && deckName.length > 0 && (
        <Text style={[styles.deckLabel, { color: c.fgSubtle }]}>{deckName}</Text>
      )}
      <Text style={[styles.kanji, { color: c.fg }]}>{card.front}</Text>
      {/* Reading shown on the front only when the user opts in; otherwise
          it joins the back along with the meaning. */}
      {prefs.front.reading && card.reading.length > 0 && (
        <Text style={[styles.reading, { color: c.fgMuted }]}>{card.reading}</Text>
      )}
      {showContextOnFront && (
        <Text style={[styles.contextClozed, { color: c.fgMuted }]}>
          {cloze(card.context_sentence, card.front)}
        </Text>
      )}

      {!isFront && (
        <>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          {!prefs.front.reading && card.reading.length > 0 && (
            <Text style={[styles.reading, { color: c.fgMuted }]}>{card.reading}</Text>
          )}
          <Text style={[styles.meaning, { color: c.fg }]}>{card.back}</Text>
          {showContextOnBack && (
            <Text style={[styles.contextRevealed, { color: c.fg }]}>
              {card.context_sentence}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: spacing.md },
  deckLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  kanji: {
    fontFamily: fontFamily.jp,
    fontSize: 56,
    fontWeight: '500',
    textAlign: 'center',
  },
  reading: {
    fontFamily: fontFamily.jp,
    fontSize: 20,
    textAlign: 'center',
  },
  meaning: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.md,
  },
  contextClozed: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.sm + 2,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  contextRevealed: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.sm + 2,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  divider: {
    width: 60,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
