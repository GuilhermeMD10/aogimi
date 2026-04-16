import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, spacing } from '@/theme/tokens';
import { SearchBar } from './SearchBar';
import { KanjiPanel } from './KanjiPanel';
import { WordsPanel } from './WordsPanel';
import { NamesPanel } from './NamesPanel';
import { useDictionarySearch } from './useDictionarySearch';

interface DictionaryScreenProps {
  /** Optional query seeded by the caller (e.g. the drawer host). */
  seedQuery?: string | null;
  /** Monotonic counter from the drawer. Each bump re-runs the seed search even
   *  if the query string is unchanged. */
  seedToken?: number;
  /** Invoked when the user taps a word row. The host decides what to do —
   *  push a detail pane inside a drawer, navigate to a route, deep-link, etc. */
  onWordPress: (id: number) => void;
}

/**
 * Search + results surface. Layout-bare: no screen chrome, no title, no
 * padding — the caller (drawer pane / full-page tab) provides its own frame.
 * This keeps the search logic and results rendering in one place so the two
 * entry points stay visually and behaviourally identical.
 */
export function DictionaryScreen({ seedQuery, seedToken, onWordPress }: DictionaryScreenProps) {
  const styles = useThemedStyles(createStyles);
  const { query, setQuery, loading, error, result, search } = useDictionarySearch();
  const lastSeedTokenRef = useRef<number | null>(null);

  // Auto-run a seed search whenever the drawer is opened with a new query
  // (e.g. tapping a kanji chip on the word detail screen). Tracking the token
  // rather than the string lets the caller re-trigger the same query.
  useEffect(() => {
    if (seedToken == null || !seedQuery) return;
    if (lastSeedTokenRef.current === seedToken) return;
    lastSeedTokenRef.current = seedToken;
    setQuery(seedQuery);
    void search(seedQuery);
  }, [seedToken, seedQuery, setQuery, search]);

  const handleSubmit = () => {
    void search(query);
  };

  const words      = result ? ('words' in result ? result.words : []) : [];
  const names      = result && 'names' in result ? result.names : [];
  const kanjiInfo  = result?.type === 'kanji' ? result.kanji : null;
  const emptyState = !loading && !error && result
    && words.length === 0 && names.length === 0 && !kanjiInfo;

  return (
    <View style={styles.root}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        loading={loading}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {kanjiInfo ? <KanjiPanel info={kanjiInfo} /> : null}
        {words.length > 0 ? <WordsPanel words={words} onWordPress={onWordPress} /> : null}
        {names.length > 0 ? <NamesPanel names={names} /> : null}

        {emptyState ? <Text style={styles.empty}>No results found.</Text> : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1, marginTop: spacing.sm },
  scrollContent: { paddingBottom: spacing.xxl },
  error: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: c.error,
  },
  empty: {
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
});
