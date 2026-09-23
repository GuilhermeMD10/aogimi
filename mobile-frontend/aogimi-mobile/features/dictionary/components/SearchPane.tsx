import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette, spacing, type, type Palette } from '@/theme';
import type { SearchState } from '../hooks/useDictionarySearch';
import { type RecentLookup, resultRows, totalResults } from '../lib';
import type { KanjiInfo, WordResult } from '../types';
import { DictHero } from './DictHero';
import { RecentLookupRow } from './RecentLookupRow';
import { ResultsKicker } from './ResultsKicker';
import { ResultsList } from './ResultsList';
import { SectionHeading } from './SectionHeading';

/**
 * The body of a **search** frame: the hero with nothing typed, results once
 * something is, recents underneath either way.
 *
 * **The search field is not in here.** It belongs to the page — `DictionaryView`
 * pins one bar above whichever pane is showing, so it survives the swap to an
 * entry and back. What this pane owns is everything *below* that bar, and the
 * two derived values only it needs: the flattened rows and the result count.
 */
export function SearchPane({
  query,
  state,
  onLoadMore,
  canLoadMore,
  loadingMore,
  recents,
  detailError,
  bottomInset,
  onOpenWord,
  onOpenRecent,
  onAddWord,
  onAddKanji,
  onOpenKanji,
  onDismissKeyboard,
}: {
  query: string;
  state: SearchState;
  /** Fetch the next page of results. */
  onLoadMore: () => void;
  /** Draw the "More results" line — there is at least one more match. */
  canLoadMore: boolean;
  /** That fetch is in flight. The rows on screen stay; the line spins. */
  loadingMore: boolean;
  recents: RecentLookup[];
  /** A failed entry load, reported above the list rather than over it. */
  detailError: string | null;
  /** Dock clearance — the pane scrolls under it. */
  bottomInset: number;
  onOpenWord: (word: WordResult) => void;
  onOpenRecent: (lookup: RecentLookup) => void;
  onAddWord: (word: WordResult) => void;
  onAddKanji: (kanji: KanjiInfo) => void;
  onOpenKanji: (literal: string) => void;
  onDismissKeyboard: () => void;
}) {
  const t = useT();
  const p = usePalette();
  const styles = useStyles(p);

  const isSearching = query.trim() !== '';
  const rows = useMemo(
    () => (isSearching && state.kind === 'results' ? resultRows(state.response) : []),
    [isSearching, state],
  );
  const total = isSearching && state.kind === 'results' ? totalResults(state.response) : 0;

  return (
    <ResultsList
      rows={rows}
      query={query}
      contentStyle={{ paddingBottom: bottomInset }}
      onOpenWord={onOpenWord}
      onAddWord={onAddWord}
      onAddKanji={onAddKanji}
      onOpenKanji={onOpenKanji}
      onScrollStart={onDismissKeyboard}
      header={
        // Tapping the header's empty space is one of the "outside" gestures
        // that closes the keyboard; the rows inside it still win their own taps.
        <PressableBackdrop onPress={onDismissKeyboard}>
          {!isSearching && (
            <DictHero
              kicker={t('dict.heroKicker')}
              title={t('dict.heroTitle')}
              caption={t('dict.heroCaption')}
            />
          )}

          {detailError !== null && <Text style={styles.error}>{detailError}</Text>}

          {isSearching && state.kind === 'loading' && (
            <ActivityIndicator color={p.muted} style={styles.spinner} />
          )}
          {isSearching && state.kind === 'error' && (
            <Text style={styles.error}>{state.message}</Text>
          )}
          {isSearching && state.kind === 'results' && total > 0 && (
            <View style={styles.kicker}>
              <ResultsKicker
                label={t('dict.results')}
                // "20+" while more pages exist: the count is what has been
                // loaded, not what matches, and a bare "20" above a "More
                // results" line is a contradiction.
                countLabel={t('dict.resultsFor', {
                  count: state.response.hasMore ? `${total}+` : total,
                })}
                query={query.trim()}
              />
            </View>
          )}
        </PressableBackdrop>
      }
      footer={
        <>
          {canLoadMore && (
            <MoreResults
              label={t('dict.moreResults')}
              loading={loadingMore}
              onPress={onLoadMore}
            />
          )}
          {/* Fills whatever the content does not, so the blank area under a
              short list is a dismiss target rather than dead page. */}
          <PressableBackdrop onPress={onDismissKeyboard} style={styles.dismissTail} />
        </>
      }
      empty={
        isSearching ? (
          state.kind === 'results' ? (
            <Text style={styles.empty}>{t('dict.noResults', { query: query.trim() })}</Text>
          ) : undefined
        ) : (
          <RecentLookups
            recents={recents}
            label={t('dict.recentlyLookedUp')}
            onOpen={onOpenRecent}
          />
        )
      }
    />
  );
}

/**
 * The line that closes the list — `DictionaryResults.dc.html`'s `4 MORE`
 * footer: a tracked mono label in `faint`, centred, with a 44pt target under
 * it. The count of what remains is unknown (`hasMore` is a fact, not a
 * number), so the label is the action rather than the figure.
 *
 * A press rather than infinite scroll on purpose: a dictionary result list is
 * something you *read*, and auto-loading moves the ground under a user who is
 * mid-way down comparing entries. It keeps its place while `loading`, showing
 * a spinner instead of the label, because the list below it does not move.
 */
function MoreResults({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <Touchable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading }}
      style={styles.more}
    >
      {loading ? (
        <ActivityIndicator color={p.faint} size="small" />
      ) : (
        <Text style={styles.moreLabel}>{label}</Text>
      )}
    </Touchable>
  );
}

/**
 * RECENTLY LOOKED UP. Absent entirely when there is nothing in it — a first-run
 * user has no history and does not need to be told so; the hero is the empty
 * state.
 */
function RecentLookups({
  recents,
  label,
  onOpen,
}: {
  recents: RecentLookup[];
  label: string;
  onOpen: (lookup: RecentLookup) => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  if (recents.length === 0) return null;
  return (
    <View style={styles.recents}>
      <SectionHeading label={label} />
      {recents.map((lookup) => (
        <RecentLookupRow key={lookup.wordId} lookup={lookup} onPress={() => onOpen(lookup)} />
      ))}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        // Grows into the leftover space below short content — see `footer`.
        dismissTail: { flexGrow: 1, minHeight: 96 },

        more: { marginTop: spacing.md, alignItems: 'center', justifyContent: 'center' },
        /** The composition's 11px/600 tracked 0.14em, in `faint`. */
        moreLabel: {
          ...type.monoMeta,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: p.faint,
        },
        spinner: { marginTop: spacing.xl },

        /** 12pt to the list below; the pinned bar supplies the 12pt above. */
        kicker: { paddingBottom: spacing.md },

        error: {
          ...type.bodySm,
          color: p.danger,
          marginTop: spacing.md,
          textAlign: 'center',
        },
        empty: {
          ...type.bodySm,
          color: p.muted,
          marginTop: spacing.xl,
          textAlign: 'center',
        },

        /** The composition stacks its cards 10pt apart under the eyebrow. */
        recents: { marginTop: spacing.xl, gap: spacing.sm + 2 },
      }),
    [p],
  );
}
