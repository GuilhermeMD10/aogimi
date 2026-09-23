import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LookupDrawers } from '@/features/dictionary/components/LookupDrawers';
import { useWordLookup } from '@/features/dictionary/hooks/useWordLookup';
import { isDue } from '@/features/sky/study/lib/srs';
import { Button, Chip, Header, PopoverMenu, Screen, SearchField } from '@/shared/components';
import { ThemeScope, usePalette, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';

import { CardRow } from '../components/CardRow';
import { useDeckDetail, useDueCounts } from '../hooks';
import { deleteCardLocal, MIX_ORDER } from '../lib';
import type { CardState, LocalCard } from '../types';
import { shownRank } from '../../lib/skyProjection';

/** The filter row: everything, what is due, then the ladder. */
type Filter = 'all' | 'due' | CardState;
const FILTERS: readonly Filter[] = ['all', 'due', ...MIX_ORDER];

/**
 * A deck's cards as a list — `SkyCardsList.dc.html`, at `/sky/[deckId]`,
 * reached from the focused deck's `List` button.
 *
 * Search, a filter row, and rows that open in place to show what the star
 * inspector shows. It is a *pushed* screen (a sibling of `(tabs)` on the root
 * stack), so there is no dock under it and the bottom padding is the home
 * indicator's alone.
 *
 * It sits in the same `ThemeScope name="night"` as the stage: this is the sky's
 * list, drawn on the sky.
 *
 * ── What the rows know about due-ness ──────────────────────────────────────
 * The header's `28 Due` is the server's figure via `useDueCounts`, the same one
 * the stage shows. The `Due` filter and each row's `DUE NOW` tag run the local
 * `isDue` predicate over the rows in hand, because a filter has to answer per
 * card and the counts endpoint returns totals. The two can differ by a card
 * for a moment after a review lands; they converge on the next focus.
 *
 * ── The `…` in the header is a placeholder ─────────────────────────────────
 * Owner's call: the deck-level menu on this screen is not wired yet, so the
 * button is present and inert rather than absent. The per-card `…` inside an
 * open row is live (delete).
 */
export function CardsListScreen({ deckId }: { deckId: string }) {
  return (
    <ThemeScope name="night">
      <CardsList deckId={deckId} />
    </ThemeScope>
  );
}

function CardsList({ deckId }: { deckId: string }) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { deck, cards, loading, error, reloadLocal } = useDeckDetail(deckId);
  const { countFor, loading: dueLoading } = useDueCounts();
  const lookup = useWordLookup();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuCard, setMenuCard] = useState<LocalCard | null>(null);

  // One clock per render for the whole list, so two rows cannot disagree about
  // "now" by the milliseconds between them.
  const now = useMemo(() => new Date(), [cards]); // eslint-disable-line react-hooks/exhaustive-deps
  const dueIds = useMemo(() => new Set(cards.filter((c) => isDue(c, now)).map((c) => c.id)), [cards, now]);

  const countsByFilter = useMemo(() => {
    const out: Record<Filter, number> = {
      all: cards.length,
      due: dueIds.size,
      new: 0,
      met: 0,
      learned: 0,
      mastered: 0,
    };
    for (const c of cards) out[shownRank(c)]++;
    return out;
  }, [cards, dueIds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter === 'due' ? !dueIds.has(c.id) : filter !== 'all' && shownRank(c) !== filter) return false;
      if (q.length === 0) return true;
      return (
        c.front.toLowerCase().includes(q) ||
        c.reading.toLowerCase().includes(q) ||
        c.back.toLowerCase().includes(q) ||
        c.meanings.some((m) => m.toLowerCase().includes(q))
      );
    });
  }, [cards, filter, query, dueIds]);

  const confirmDelete = useCallback(() => {
    if (!menuCard) return;
    const { id, front } = menuCard;
    Alert.alert(t('sky.confirm.deleteCardTitle', { front }), t('sky.confirm.deleteCardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sky.deleteCard'),
        style: 'destructive',
        onPress: () => {
          setExpandedId((cur) => (cur === id ? null : cur));
          void deleteCardLocal(id).then(reloadLocal);
        },
      },
    ]);
  }, [menuCard, reloadLocal, t]);

  const filterLabel = (f: Filter) =>
    f === 'all' ? t('sky.cards.all') : f === 'due' ? t('sky.cards.due') : t(`sky.rank.${f}`);

  return (
    <Screen padded>
      <StatusBar style="light" />
      <Header
        title={deck?.name ?? ''}
        japanese
        subtitle={
          deck
            ? t('sky.starsDue', {
                stars: cards.length.toLocaleString(),
                due: dueLoading ? '—' : countFor(deckId).toLocaleString(),
              })
            : undefined
        }
        onBack={() => router.back()}
        backLabel={t('sky.backToDeck')}
        onMore={() => {}}
        moreLabel={t('sky.cards.moreSoon')}
        moreDisabled
      />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={p.muted} />
        </View>
      ) : error || !deck ? (
        <View style={s.centered}>
          <Text style={s.empty}>{error ?? t('sky.cards.notFound')}</Text>
          <Button label={t('common.back')} variant="secondary" size="small" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('sky.cards.search')}
            clearLabel={t('sky.cards.clear')}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filters}
            style={s.filtersScroll}
          >
            {FILTERS.map((f) => (
              <Chip
                key={f}
                label={filterLabel(f)}
                count={countsByFilter[f]}
                active={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </ScrollView>

          <FlatList
            data={visible}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <CardRow
                card={item}
                due={dueIds.has(item.id)}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId((cur) => (cur === item.id ? null : item.id))}
                onMore={() => setMenuCard(item)}
                onLookUp={() => lookup.open(item.front)}
              />
            )}
            contentContainerStyle={[s.list, { paddingBottom: insets.bottom + spacing.screenBottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={s.empty}>{cards.length === 0 ? t('sky.cards.empty') : t('sky.cards.noMatches')}</Text>
            }
          />
        </>
      )}

      <PopoverMenu
        visible={menuCard !== null}
        onDismiss={() => setMenuCard(null)}
        items={[
          { key: 'delete', label: t('sky.deleteCard'), icon: 'trash-2', destructive: true, onPress: confirmDelete },
        ]}
      />

      <LookupDrawers {...lookup.drawers} />
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
        filtersScroll: { flexGrow: 0, marginTop: spacing.sm + 2 },
        filters: { gap: spacing.sm, paddingVertical: 2 },
        list: { gap: spacing.sm, paddingTop: spacing.md },
        empty: { ...type.bodyMd, color: p.muted, textAlign: 'center', paddingVertical: spacing.xxl },
      }),
    [p],
  );
}
