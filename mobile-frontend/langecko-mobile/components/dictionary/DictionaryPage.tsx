import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { DictionaryScreen } from './DictionaryScreen';
import { SavedWordsList } from './SavedWordsList';
import { WordDetailPanel } from './WordDetailPanel';
import { useSavedWords } from './useSavedWords';

type InnerTab = 'search' | 'saved';
type NavState =
  | { view: 'list'; tab: InnerTab }
  | { view: 'word'; wordId: string; returnTab: InnerTab };

interface DictionaryPageProps {
  /** Optional seeded query (e.g. handoff from the reader). */
  seedQuery?: string | null;
  /** Monotonic counter bumped by the host whenever a new seed arrives. */
  seedToken?: number;
}

/**
 * Full-page Dictionary surface, rendered as a standalone tab.
 *
 * Combines three panes in a mini navigation stack so the user never leaves
 * the tab while exploring words:
 *   - Search (DictionaryScreen) — the live search interface.
 *   - Saved  (SavedWordsList)   — bookmarks, sub-section per the product spec.
 *   - Word   (WordDetailPanel)  — detail view pushed from either list tab.
 *
 * This deliberately mirrors the drawer's two-view stack pattern so a user
 * moving between drawer and full-page surface gets a consistent model.
 */
export function DictionaryPage({ seedQuery, seedToken }: DictionaryPageProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [nav, setNav] = useState<NavState>({ view: 'list', tab: 'search' });
  const { savedWords, removeSaved } = useSavedWords();

  const goToWord = useCallback(
    (id: number) => {
      setNav((prev) => ({
        view: 'word',
        wordId: String(id),
        returnTab: prev.view === 'list' ? prev.tab : prev.returnTab,
      }));
    },
    [],
  );

  const goToList = useCallback(() => {
    setNav((prev) =>
      prev.view === 'word'
        ? { view: 'list', tab: prev.returnTab }
        : prev,
    );
  }, []);

  const goToSearch = useCallback((query?: string) => {
    // Tapping a kanji inside a word detail should land on Search with the
    // char pre-queried. We fold back to the list view and switch the tab.
    setNav({ view: 'list', tab: 'search' });
    if (query !== undefined) {
      // Bubble a synthetic seed by bumping our own token. See kanjiSeed below.
      bumpKanjiSeed(query);
    }
  }, []);

  // ── Local kanji seed plumbing ─────────────────────────────────────────────
  //
  // We use a second (seedQuery, seedToken) pair internally so taps on a kanji
  // chip inside WordDetailPanel can re-trigger a DictionaryScreen search
  // without leaking that wiring into callers.
  const [kanjiSeed, setKanjiSeed] = useState<{ q: string; t: number } | null>(null);
  const bumpKanjiSeed = (q: string) =>
    setKanjiSeed((prev) => ({ q, t: (prev?.t ?? 0) + 1 }));

  const effectiveSeedQuery = kanjiSeed?.q ?? seedQuery ?? null;
  const effectiveSeedToken = kanjiSeed?.t ?? seedToken ?? 0;

  const tabRow = useMemo(
    () => (
      <View style={styles.tabRow}>
        <TabButton
          label="Search"
          active={nav.view === 'list' && nav.tab === 'search'}
          onPress={() => setNav({ view: 'list', tab: 'search' })}
          styles={styles}
          rippleColor={colors.border}
        />
        <TabButton
          label={`Saved${savedWords.length > 0 ? ` (${savedWords.length})` : ''}`}
          active={nav.view === 'list' && nav.tab === 'saved'}
          onPress={() => setNav({ view: 'list', tab: 'saved' })}
          styles={styles}
          rippleColor={colors.border}
        />
      </View>
    ),
    [nav, savedWords.length, styles, colors.border],
  );

  // Word detail view owns its own safe area, so we don't wrap it.
  if (nav.view === 'word') {
    return (
      <View style={styles.rootNoPad}>
        <WordDetailPanel
          id={nav.wordId}
          onBack={goToList}
          onKanjiPress={(char) => goToSearch(char)}
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Text style={styles.title}>Dictionary</Text>
      {tabRow}
      <View style={styles.body}>
        {nav.tab === 'search' ? (
          <DictionaryScreen
            seedQuery={effectiveSeedQuery}
            seedToken={effectiveSeedToken}
            onWordPress={goToWord}
          />
        ) : (
          <SavedWordsList
            words={savedWords}
            onWordPress={goToWord}
            onRemove={removeSaved}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
  styles,
  rippleColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  rippleColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.tabBtn,
        active && styles.tabBtnActive,
        pressed && !active && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  rootNoPad: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    backgroundColor: c.bgSurface,
  },
  tabBtnActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: c.textPrimary,
  },
  tabLabelActive: { color: c.accentOn },
  body: { flex: 1 },
});
