import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import { SyncPill } from '@/features/books/library/components/SyncPill';
import { StateBreakdown } from '@/features/sky/study/components/StateBreakdown';
import { DeckCover } from './DeckCover';
import type { DeckWithCount } from '../hooks/useDecks';

export function DeckGridItem({
  deck,
  onPress,
}: {
  deck: DeckWithCount;
  onPress?: () => void;
}) {
  const c = useColors();
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.root, { backgroundColor: c.bgElev, borderColor: c.border }]}
    >
      <View style={styles.coverWrap}>
        <DeckCover deckKey={deck.id} deckName={deck.name} height={92} cornerRadius={0} />
        {/* Synced decks don't display any badge — only the unsynced
            ones get a small blue dot to nudge the user toward Sync now. */}
        {deck.syncState === 'pending' && (
          <View style={styles.pillSlot}>
            <SyncPill state="unsynced" variant="dot" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: c.fg }]} numberOfLines={1}>
          {deck.name}
        </Text>
        {deck.description?.length > 0 && (
          <Text style={[styles.desc, { color: c.fgMuted }]} numberOfLines={2}>
            {deck.description}
          </Text>
        )}
        <Text style={[styles.count, { color: c.fgSubtle }]}>
          {t('decks.cards', { count: deck.cardCount })}
        </Text>
        <View style={styles.breakdownSlot}>
          <StateBreakdown stats={deck.stats} variant="inline" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  coverWrap: { position: 'relative' },
  pillSlot: { position: 'absolute', top: 6, right: 6 },
  info: { padding: 12, gap: 3 },
  name: { fontSize: fontSize.sm + 1, fontWeight: '600', letterSpacing: -0.2 },
  desc: { fontSize: fontSize.xs, lineHeight: 16 },
  count: {
    fontSize: fontSize.xs,
    fontVariant: ['tabular-nums'],
    marginTop: 6,
    fontFamily: fontFamily.ui,
  },
  breakdownSlot: { marginTop: 2 },
});
