import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useDockClearance } from '@/features/app-shell/Dock';
import { Screen } from '@/shared/components/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { SearchResponse, WordDetails, WordResult } from '../types';
import { FlashcardDrawer, type FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';
import { DictEntry } from './DictEntry';
import { DictResultRow } from './DictResultRow';
import { DictEmpty } from './DictEmpty';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import { useDictionaryNav } from '../hooks/useDictionaryNav';
import {
  getRecentSearches,
  pushRecentLookup,
  pushRecentSearch,
  type RecentSearchItem,
} from '../lib/dictionaryStorage';
import { wordCardDraft } from '../lib/cardDraft';
import { useLocalSearchParams, useNavigation } from 'expo-router';

export function DictionaryScreen() {
  const c = useColors();

  const nav = useDictionaryNav();
  const { current, canGoBack, query, setQuery, openDetail, openKanjiSearch, back, detailError } =
    nav;

  // Re-tapping the Dictionary tab while inside a detail / loading frame
  // pops one step in the in-app stack instead of re-focusing the (already
  // focused) tab. Mirrors the Android hardware-back behaviour.
  const navigation = useNavigation();
  useEffect(() => {
    type TabPressEvent = { preventDefault: () => void };
    const unsub = navigation.addListener('tabPress' as never, ((e: TabPressEvent) => {
      if (canGoBack) {
        e.preventDefault();
        back();
      }
    }) as never);
    return unsub;
  }, [navigation, canGoBack, back]);

  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);
  const [recents, setRecents] = useState<RecentSearchItem[]>([]);
  const searchState = useDictionarySearch(query);

  // Load recents on mount.
  useEffect(() => {
    void getRecentSearches().then(setRecents);
  }, []);

  // ── Deep link: `?word=<id>&n=<nonce>` opens that entry directly ────────────
  // Home's recent-lookups rows arrive here. The id, not a query string, because
  // the user already chose an entry — re-running a *search* could land them on
  // a different word with the same spelling.
  //
  // `n` is a nonce and is load-bearing: this tab stays mounted, so pushing the
  // same `word` twice would leave the params identical and the dedupe below
  // would swallow the second tap.
  const { word: wordParam, n: nonceParam } = useLocalSearchParams<{
    word?: string;
    n?: string;
  }>();
  const handledLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!wordParam) return;
    const token = `${wordParam}:${nonceParam ?? ''}`;
    if (handledLinkRef.current === token) return;
    handledLinkRef.current = token;
    const id = Number(wordParam);
    if (Number.isFinite(id)) void openDetail(id);
  }, [wordParam, nonceParam, openDetail]);

  // Was an inline builder that took 2 glosses, joined them with `; ` and
  // dropped the JLPT tier. `wordCardDraft` is the one place that decision is
  // made now — shared with the reader, which had its own drifted copy.
  const addFlashcardFromDetails = useCallback((details: WordDetails) => {
    setFlashcardPrefill(wordCardDraft(details.word, query, details.sentences));
  }, [query]);

  const handleOpenDetail = useCallback(
    async (id: number, lookupQuery: string) => {
      // Push the committed query to recents the moment the user picks a
      // result — that's the strongest signal of intent in an autosearch UI.
      const trimmed = lookupQuery.trim();
      if (trimmed) {
        const next = await pushRecentSearch(trimmed);
        setRecents(next);
      }
      const details = await openDetail(id);
      // The *entry* recents, which Home reads — a separate store from the
      // query recents above, because "words I looked at" and "things I typed"
      // are different lists. Written after the detail resolves, so a lookup
      // that failed to load never lands in the list.
      if (details) void pushRecentLookup(details.word, trimmed || undefined);
    },
    [openDetail],
  );

  return (
    <Screen padded>
      {current.kind === 'search' && (
        <SearchView
          query={query}
          setQuery={setQuery}
          searchState={searchState}
          onPickResult={(id) => void handleOpenDetail(id, query)}
          errorBanner={detailError}
          canGoBack={canGoBack}
          onBack={back}
          recents={recents}
          onPickRecent={(q) => setQuery(q)}
        />
      )}

      {current.kind === 'detailLoading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      )}

      {current.kind === 'detail' && (
        <DetailView
          details={current.details}
          query={query}
          onBack={back}
          onAddFlashcard={() => addFlashcardFromDetails(current.details)}
          onKanjiPress={openKanjiSearch}
        />
      )}

      <FlashcardDrawer
        visible={flashcardPrefill !== null}
        prefill={flashcardPrefill}
        onDismiss={() => setFlashcardPrefill(null)}
      />
    </Screen>
  );
}

// ── Search view ──────────────────────────────────────────────────────────────

function SearchView({
  query,
  setQuery,
  searchState,
  onPickResult,
  errorBanner,
  canGoBack,
  onBack,
  recents,
  onPickRecent,
}: {
  query: string;
  setQuery: (v: string) => void;
  searchState: ReturnType<typeof useDictionarySearch>;
  onPickResult: (id: number) => void;
  errorBanner: string | null;
  canGoBack: boolean;
  onBack: () => void;
  recents: RecentSearchItem[];
  onPickRecent: (q: string) => void;
}) {
  const c = useColors();

  const trimmed = query.trim();
  const isSearching = trimmed !== '';

  // One scrollable list at all times. The hero card (search bar + recents)
  // is the list header so its position never shifts between empty and
  // searching states — only the body below it swaps. When searching,
  // results render as the list items; when empty, the list is empty and
  // only the card is visible.
  const header = (
    <View>
      {canGoBack && (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backRow}>
          <Feather name="chevron-left" size={20} color={c.fg} />
          <Text style={[styles.backLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
            Back
          </Text>
        </Pressable>
      )}
      <DictEmpty
        query={query}
        setQuery={setQuery}
        recents={recents}
        onPickRecent={onPickRecent}
        isSearching={isSearching}
      />
      {errorBanner && <Text style={[styles.error, { color: c.error }]}>{errorBanner}</Text>}
      {isSearching && (
        <View style={styles.bodyState}>
          {searchState.kind === 'loading' && (
            <ActivityIndicator color={c.fg} style={{ marginVertical: spacing.lg }} />
          )}
          {searchState.kind === 'error' && (
            <Text style={[styles.bodyError, { color: c.error }]}>{searchState.message}</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <ResultsBody
      header={header}
      searchState={searchState}
      query={query}
      isSearching={isSearching}
      onPick={onPickResult}
    />
  );
}

function ResultsBody({
  header,
  searchState,
  query,
  isSearching,
  onPick,
}: {
  header: React.ReactElement;
  searchState: ReturnType<typeof useDictionarySearch>;
  query: string;
  isSearching: boolean;
  onPick: (id: number) => void;
}) {
  const c = useColors();
  // Without this the last result sits under the dock's glass — see the hook.
  const dockClearance = useDockClearance();
  const words =
    isSearching && searchState.kind === 'results' ? collectWords(searchState.response) : [];

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={[styles.scrollBody, { paddingBottom: dockClearance }]}
      data={words}
      keyExtractor={(w) => String(w.id)}
      renderItem={({ item, index }) => (
        <DictResultRow
          word={item}
          index={index}
          active={index === 0}
          query={query}
          onPress={() => onPick(item.id)}
        />
      )}
      ListHeaderComponent={
        <View>
          {header}
          {isSearching && searchState.kind === 'results' && words.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsKicker, { color: c.accent, fontFamily: fontFamily.ui }]}>
                Dictionary
              </Text>
              <Text
                style={[styles.resultsCount, { color: c.fg, fontFamily: fontFamily.displayBold }]}
              >
                {words.length} result{words.length !== 1 ? 's' : ''} for{' '}
                <Text style={{ color: c.accent }}>「{query}」</Text>
              </Text>
              <Text
                style={[styles.resultsSubtitle, { color: c.fgMuted, fontFamily: fontFamily.reader }]}
              >
                JMdict entries · kanji, reading, cross-reference matches
              </Text>
            </View>
          )}
        </View>
      }
      ListFooterComponent={
        isSearching && searchState.kind === 'results' ? (
          words.length === 0 ? (
            <Text
              style={[styles.noResults, { color: c.fgMuted, fontFamily: fontFamily.reader }]}
            >
              No results for “{query}”
            </Text>
          ) : (
            <View style={styles.resultsFooter}>
              <Text
                style={[styles.resultsFooterText, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}
              >
                End of results
              </Text>
            </View>
          )
        ) : null
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

function collectWords(res: SearchResponse): WordResult[] {
  if ('words' in res) return res.words;
  return [];
}

// ── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  details,
  query,
  onBack,
  onAddFlashcard,
  onKanjiPress,
}: {
  details: WordDetails;
  query: string;
  onBack: () => void;
  onAddFlashcard: () => void;
  onKanjiPress: (literal: string) => void;
}) {
  const c = useColors();
  const t = useT();
  // Room the floating dock occupies (its height plus the safe-area offset). Pushes the FAB and the
  // scroll's bottom padding above it so neither gets occluded. Not `useBottomTabBarHeight()` — the
  // dock is absolutely positioned inside a `box-none` host, so that hook can answer 0 here.
  const dockClearance = useDockClearance();
  return (
    <View style={styles.flex}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backRow}>
          <Feather name="chevron-left" size={22} color={c.fg} />
          <Text style={[styles.backLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
            Results
          </Text>
        </Pressable>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.detailScroll,
          // Clear the FAB + the dock. FAB sits at `dockClearance +
          // spacing.lg`; add its visual height (~52) plus spacing so
          // the last word doesn't hide behind it.
          { paddingBottom: dockClearance + spacing.lg + 52 + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DictEntry
          word={details.word}
          kanjis={details.kanjis}
          sentences={details.sentences}
          query={query}
          onKanjiPress={onKanjiPress}
        />
      </ScrollView>
      <Pressable
        onPress={onAddFlashcard}
        accessibilityRole="button"
        accessibilityLabel={t('dict.addFlashcard')}
        style={[
          styles.fab,
          { bottom: dockClearance + spacing.lg, backgroundColor: c.fg },
        ]}
      >
        <Feather name="plus" size={20} color={c.bg} />
        <Text style={[styles.fabLabel, { color: c.bg, fontFamily: fontFamily.ui }]}>
          {t('dict.addFlashcard')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // paddingBottom comes from useDockClearance() at the call site — the dock floats, so the figure
  // depends on the safe-area inset and can't be a constant here.
  scrollBody: {
    paddingTop: spacing.md,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.md,
  },
  backLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  error: { fontSize: fontSize.sm, marginTop: spacing.sm },
  bodyState: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  bodyError: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  noResults: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  resultsHeader: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  resultsKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultsCount: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  resultsSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  resultsFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  resultsFooterText: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  detailHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  detailScroll: {
    paddingTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    right: 0,
    // `bottom` is set inline at render time using the runtime tab bar
    // height (see DetailView). Setting a static value here would race
    // with the inline override on some platforms.
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.pill,
  },
  fabLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
