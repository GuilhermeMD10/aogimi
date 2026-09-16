import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { IconButton } from '@/shared/components/IconButton';
import { Screen } from '@/shared/components/Screen';
import { useDockClearance } from '@/features/app-shell/Dock';
import { FlashcardDrawer, type FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import type { KanjiInfo, WordDetails, WordResult } from '../types';
import { useDictionaryNav } from '../hooks/useDictionaryNav';
import { useDictionarySearch } from '../hooks/useDictionarySearch';
import { useSearchKeyboard } from '../hooks/useSearchKeyboard';
import { kanjiCardDraft, wordCardDraft } from '../lib/cardDraft';
import { fetchWordDetails } from '../lib/dictApi';
import { getRecentLookups, pushRecentLookup, type RecentLookup } from '../lib/dictionaryStorage';
import { SearchField } from '../components/SearchField';
import { SearchPane } from '../components/SearchPane';
import { EntryPane } from '../components/EntryPane';

/**
 * The dictionary tab.
 *
 * **A page and three panes.** This file is the page: the pinned bar, the frame
 * stack, and the data the panes render. Every pixel below the bar belongs to a
 * pane — `SearchPane` for a search frame, `EntryPane` for an entry, a spinner
 * for the moment between them — and each pane is a component in `../components`
 * reading `usePalette()` with a memoised style factory.
 *
 * ── The bar: a field on search frames, a chevron on the rest ───────────────
 * On a **search** frame the bar is the search field, with the back circle
 * beside it once a kanji has been drilled into. On an **entry** the field is
 * gone — the page is the word, and the way back to the results is the
 * chevron. `useDictionaryNav` still addresses the nearest search frame's
 * query, so the field comes back showing what led here, and editing it from
 * a drilled search still unwinds the frames above.
 *
 * The field stays outside `SearchPane` so that it does not move or re-mount as
 * the pane swaps between the hero and results while the user types. Every
 * path that leaves a search frame calls `dismiss()` first (see
 * `useSearchKeyboard`), so the field is blurred before it unmounts.
 *
 * ── Why a stack, not three flat states ──────────────────────────────────────
 * The tab is a **frame stack** (`useDictionaryNav`): tapping a kanji inside an
 * entry pushes a fresh *search* frame, so a user can drill 辞書 → 辞 → 辭典 →
 * … and unwind one step at a time. Android's hardware back, the chevron and
 * re-tapping the tab all pop it.
 *
 * ── Recents are lookups, not queries ─────────────────────────────────────────
 * One store — see `lib/dictionaryStorage.ts`. This list and Home's card are
 * the same data, a row here opens the exact word rather than re-running a
 * search, and a word looked up in the reader appears in both.
 */
export function DictionaryView() {
  const t = useT();
  const p = usePalette();
  const dockClearance = useDockClearance();

  const { current, canGoBack, query, setQuery, openDetail, openKanjiSearch, back, detailError } =
    useDictionaryNav();

  const search = useDictionarySearch(query);
  const { inputRef, dismiss } = useSearchKeyboard();
  const [prefill, setPrefill] = useState<FlashcardPrefill | null>(null);
  const [recents, setRecents] = useState<RecentLookup[]>([]);

  // Re-tapping the Dictionary tab while inside a detail / loading frame pops
  // one step in the in-app stack instead of re-focusing the (already focused)
  // tab. Mirrors the Android hardware-back behaviour.
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

  // Read on focus, not once on mount: the reader's drawer writes to the same
  // store, so a word looked up mid-session has to appear here without an app
  // restart. Home does the same for the same reason.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getRecentLookups().then((next) => {
        if (!cancelled) setRecents(next);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // ── Deep link: `?word=<id>&n=<nonce>` opens that entry directly ────────────
  // Home's recent-lookup rows arrive here. The id, not a query string, because
  // the user already chose an entry — re-running a *search* could land them on
  // a different word with the same spelling.
  //
  // `n` is a nonce and is load-bearing: this tab stays mounted, so pushing the
  // same `word` twice would leave the params identical and the dedupe below
  // would swallow the second tap.
  const { word: wordParam, n: nonceParam } = useLocalSearchParams<{ word?: string; n?: string }>();
  const handledLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!wordParam) return;
    const token = `${wordParam}:${nonceParam ?? ''}`;
    if (handledLinkRef.current === token) return;
    handledLinkRef.current = token;
    const id = Number(wordParam);
    if (Number.isFinite(id)) void openDetail(id);
  }, [wordParam, nonceParam, openDetail]);

  const openWord = useCallback(
    async (id: number, lookupQuery: string) => {
      dismiss();
      const details = await openDetail(id);
      // Written after the detail resolves, so a lookup that failed to load
      // never lands in the list. `lookupQuery` is what picks the headword —
      // see `preferredHeadword`.
      if (details) setRecents(await pushRecentLookup(details.word, lookupQuery.trim() || undefined));
    },
    [openDetail, dismiss],
  );

  // A row holds a `WordResult`, and example sentences hang off the *entry*, so
  // the add circle resolves the entry before it builds the draft. Without that
  // step a card added from the results list saved with no context sentence
  // while the same word added from its entry saved with one — the sentence is
  // the one part of a card the user never types, so losing it is silent.
  //
  // Not the round trip it reads as: the dictionary is bundled SQLite behind an
  // LRU cache (`lib/dictApi`), and it is the same read tapping the row itself
  // would do — usually already cached by the time the circle is pressed.
  const addWord = useCallback(
    async (word: WordResult) => {
      dismiss();
      // A lookup that fails still opens the drawer, just without the context.
      // The user asked for a card; the sentence is a bonus the entry happened
      // to carry, not the reason they tapped.
      const details = await fetchWordDetails(word.id).catch(() => null);
      setPrefill(wordCardDraft(word, query, details?.sentences));
    },
    [query, dismiss],
  );
  const addKanji = useCallback(
    (kanji: KanjiInfo) => {
      dismiss();
      setPrefill(kanjiCardDraft(kanji));
    },
    [dismiss],
  );
  const addFromEntry = useCallback(
    (details: WordDetails) => setPrefill(wordCardDraft(details.word, query, details.sentences)),
    [query],
  );

  // Both cross a frame boundary, and a frame boundary unmounts the pane — the
  // exact transition that used to leave RN holding a stale focused node.
  const openKanji = useCallback(
    (literal: string) => {
      dismiss();
      openKanjiSearch(literal);
    },
    [dismiss, openKanjiSearch],
  );
  const goBack = useCallback(() => {
    dismiss();
    back();
  }, [dismiss, back]);

  return (
    <Screen padded>
      <View style={styles.pinned}>
        {current.kind === 'search' ? (
          <View style={styles.bar}>
            {canGoBack && (
              <IconButton glyph="back" onPress={goBack} accessibilityLabel={t('dict.back')} />
            )}
            <SearchField
              value={query}
              ref={inputRef}
              onChangeText={setQuery}
              placeholder={t('dict.fieldPlaceholder')}
              onSubmit={dismiss}
              clearLabel={t('dict.clearSearch')}
              style={styles.field}
            />
          </View>
        ) : (
          // An entry, or the moment before one: no search bar, just the way
          // back to the results that produced it.
          <IconButton glyph="back" onPress={goBack} accessibilityLabel={t('dict.backToResults')} />
        )}
      </View>

      {current.kind === 'search' && (
        <SearchPane
          query={query}
          state={search.state}
          onLoadMore={search.loadMore}
          canLoadMore={search.canLoadMore}
          loadingMore={search.loadingMore}
          recents={recents}
          detailError={detailError}
          bottomInset={dockClearance}
          onOpenWord={(w) => void openWord(w.id, query)}
          onOpenRecent={(lookup) => void openWord(lookup.wordId, lookup.headword)}
          onAddWord={(w) => void addWord(w)}
          onAddKanji={addKanji}
          onOpenKanji={openKanji}
          onDismissKeyboard={dismiss}
        />
      )}

      {current.kind === 'detailLoading' && (
        <View style={styles.centered}>
          <ActivityIndicator color={p.muted} />
        </View>
      )}

      {current.kind === 'detail' && (
        <EntryPane
          details={current.details}
          query={query}
          bottomInset={dockClearance}
          onAddToDeck={() => addFromEntry(current.details)}
          onKanjiPress={openKanji}
        />
      )}

      <FlashcardDrawer
        visible={prefill !== null}
        prefill={prefill}
        onDismiss={() => setPrefill(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The bar's own block: DESIGN.md's 16pt below the status bar, and 12pt to
  // whichever pane follows — the panes supply none of their own, so the bar's
  // position is set here alone.
  pinned: { paddingTop: spacing.screenTop, paddingBottom: spacing.md },
  /** `[44 back] [12] [field]` — the header row's geometry with the field in
   *  the title's place. */
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  field: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
