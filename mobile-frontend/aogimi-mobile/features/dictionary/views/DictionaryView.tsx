import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { BackButton } from '@/shared/components/BackButton';
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
import { getRecentLookups, pushRecentLookup, type RecentLookup } from '../lib/dictionaryStorage';
import { SearchField } from '../components/SearchField';
import { SearchPane } from '../components/SearchPane';
import { EntryPane } from '../components/EntryPane';

/**
 * The dictionary tab.
 *
 * **A page and three panes.** This file is the page: the back control, the one
 * search bar, the frame stack, and the data the panes render. Every pixel below
 * the bar belongs to a pane — `SearchPane` for a search frame, `EntryPane` for
 * an entry, a spinner for the moment between them — and each pane is a
 * component in `../components` reading `usePalette()` with a memoised style
 * factory.
 *
 * ── One bar, above everything ───────────────────────────────────────────────
 * The field is **outside the frame switch**, so it is the same mounted input in
 * every state: it does not move, re-mount, or lose focus when a result opens,
 * and there is always somewhere to type. It shows the query that led to
 * whatever is on screen — on an entry, that is the search below it — and typing
 * unwinds back to those results. `useDictionaryNav` holds that rule.
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

  // Adding from a result row needs no round trip: `wordCardDraft` takes the
  // `WordResult` the list already holds. Only the entry's own button has
  // example sentences to pass, which is the one thing a row cannot supply.
  const addWord = useCallback(
    (word: WordResult) => {
      dismiss();
      setPrefill(wordCardDraft(word, query));
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
      {/* Pinned above every frame: the chevron out of a drilled-into frame and
          the one search field. Outside the switch below, so no state change can
          move either of them. */}
      <View style={styles.pinned}>
        {canGoBack && (
          <BackButton
            label={current.kind === 'detail' ? t('dict.backToResults') : t('dict.back')}
            onPress={goBack}
          />
        )}
        <SearchField
          value={query}
          ref={inputRef}
          onChangeText={setQuery}
          placeholder={t('dict.fieldPlaceholder')}
          active={query.trim() !== ''}
          onSubmit={dismiss}
          clearLabel={t('dict.clearSearch')}
        />
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
          onPickSuggestion={setQuery}
          onOpenWord={(w) => void openWord(w.id, query)}
          onOpenRecent={(lookup) => void openWord(lookup.wordId, lookup.headword)}
          onAddWord={addWord}
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
  // The bar's own block. `paddingBottom` is the gap to whichever pane follows;
  // the panes supply none of their own, so the bar's position is set here alone.
  pinned: { paddingBottom: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
