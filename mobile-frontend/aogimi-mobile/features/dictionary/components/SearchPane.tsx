import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import type { SearchState } from '../hooks/useDictionarySearch';
import type { RecentLookup } from '../lib/dictionaryStorage';
import { resultRows, totalResults } from '../lib/resultSections';
import type { KanjiInfo, WordResult } from '../types';
import { DictHero } from './DictHero';
import { RecentLookupRow } from './RecentLookupRow';
import { ResultsList } from './ResultsList';
import { SectionHeading } from './SectionHeading';
import { SuggestionChips } from './SuggestionChips';

/**
 * The body of a **search** frame: hero and suggestions with nothing typed,
 * results once something is, recents underneath either way.
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
  onPickSuggestion,
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
  /** Draw the "More results" button — there is at least one more match. */
  canLoadMore: boolean;
  /** That fetch is in flight. The rows on screen stay; the button spins. */
  loadingMore: boolean;
  recents: RecentLookup[];
  /** A failed entry load, reported above the list rather than over it. */
  detailError: string | null;
  /** Dock clearance — the pane scrolls under it. */
  bottomInset: number;
  onPickSuggestion: (term: string) => void;
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
        // that closes the keyboard; the chips and rows inside it still win
        // their own taps.
        <PressableBackdrop onPress={onDismissKeyboard}>
          {!isSearching && (
            <DictHero
              kicker={t('dict.heroKicker')}
              title={t('dict.heroTitle')}
              caption={t('dict.heroCaption')}
            />
          )}

          {!isSearching && <SuggestionChips onPick={onPickSuggestion} />}

          {detailError !== null && <Text style={styles.error}>{detailError}</Text>}

          {isSearching && state.kind === 'loading' && (
            <ActivityIndicator color={p.muted} style={styles.spinner} />
          )}
          {isSearching && state.kind === 'error' && (
            <Text style={styles.error}>{state.message}</Text>
          )}
          {isSearching && state.kind === 'results' && total > 0 && (
            <View style={styles.resultsHeading}>
              <SectionHeading
                label={t('dict.results')}
                tone="accent"
                trailing={
                  <Text style={styles.count}>
                    {/* "20+" while more pages exist: the count is what has been
                        loaded, not what matches, and a bare "20" beside a
                        "More results" button is a contradiction. */}
                    {t('dict.resultsFor', {
                      count: state.response.hasMore ? `${total}+` : total,
                    })}{' '}
                    <Text style={styles.countQuery}>「{query.trim()}」</Text>
                  </Text>
                }
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
 * The "More results" button that closes the list.
 *
 * A button rather than infinite scroll on purpose: a dictionary result list is
 * something you *read*, and auto-loading moves the ground under a user who is
 * mid-way down comparing entries. It also keeps the paging explicit — you can
 * see that there is more, and choose.
 *
 * It keeps its place while `loading`, showing a spinner instead of the label,
 * because the list below it does not move — swapping the button out for a row
 * of results is the only thing that should shift the layout.
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
      surface="glass"
      radius={radius.md}
      style={styles.more}
    >
      {loading ? (
        <ActivityIndicator color={p.muted} size="small" />
      ) : (
        <Text style={styles.moreLabel}>{label}</Text>
      )}
    </Touchable>
  );
}

/**
 * RECENTLY LOOKED UP. Absent entirely when there is nothing in it — a first-run
 * user has no history and does not need to be told so; the hero and the
 * suggestion chips are the empty state.
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
      <View style={styles.recentsHeading}>
        <SectionHeading label={label} />
      </View>
      {recents.map((lookup, i) => (
        <RecentLookupRow
          key={lookup.wordId}
          lookup={lookup}
          divider={i < recents.length - 1}
          onPress={() => onOpen(lookup)}
        />
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

        more: {
          marginTop: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md + 1,
        },
        moreLabel: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xs,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: p.soft,
        },
        spinner: { marginTop: spacing.xl },

        resultsHeading: { marginTop: spacing.lg, marginBottom: spacing.sm },
        count: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm - 1,
          color: p.muted,
        },
        countQuery: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.sm + 1,
          color: p.ink,
        },

        error: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.danger,
          marginTop: spacing.md,
          textAlign: 'center',
        },
        empty: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm,
          color: p.muted,
          marginTop: spacing.xl,
          textAlign: 'center',
        },

        recents: { marginTop: spacing.xl },
        recentsHeading: {
          paddingBottom: spacing.md - 1,
          borderBottomWidth: 1,
          borderBottomColor: p.paperBd,
        },
      }),
    [p],
  );
}
