import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';
import type { SavedWord } from './useSavedWords';

interface SavedWordsListProps {
  words: SavedWord[];
  onWordPress: (id: number) => void;
  onRemove: (id: number) => void;
}

/**
 * Vertical list of the user's bookmarked dictionary entries. Layout-bare:
 * the caller supplies the wrapping screen / tab content surface. Rows show
 * headword + reading + the first meaning preview; the trailing "✕" removes
 * the saved entry without navigating away.
 */
export function SavedWordsList({ words, onWordPress, onRemove }: SavedWordsListProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  if (words.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No saved words yet</Text>
        <Text style={styles.emptyBody}>
          Open any word from a search and tap the bookmark icon to save it for later.
        </Text>
      </View>
    );
  }

  // Newest-first — the last thing the user saved is most likely to matter.
  const sorted = [...words].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(w) => String(w.id)}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={Separator}
      renderItem={({ item }) => (
        <Row
          word={item}
          onPress={() => onWordPress(item.id)}
          onRemove={() => onRemove(item.id)}
          styles={styles}
          rippleColor={colors.border}
        />
      )}
    />
  );
}

function Row({
  word,
  onPress,
  onRemove,
  styles,
  rippleColor,
}: {
  word: SavedWord;
  onPress: () => void;
  onRemove: () => void;
  styles: ReturnType<typeof createStyles>;
  rippleColor: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [styles.rowBody, pressed && styles.rowBodyPressed]}
      >
        <View style={styles.headwordRow}>
          <Text style={styles.headword} numberOfLines={1}>{word.headword}</Text>
          {word.reading && word.reading !== word.headword ? (
            <Text style={styles.reading} numberOfLines={1}>【{word.reading}】</Text>
          ) : null}
        </View>
        {word.glosses ? (
          <Text style={styles.gloss} numberOfLines={2}>{word.glosses}</Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={12}
        android_ripple={{ color: rippleColor, borderless: true }}
        style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.removeLabel}>✕</Text>
      </Pressable>
    </View>
  );
}

function Separator() {
  return <View style={separatorStyles.sep} />;
}

// Separator uses a fixed height with no color dependency, but StyleSheet.create
// still needs to be called. Keep it separate to avoid re-creating on theme change.
const separatorStyles = StyleSheet.create({
  sep: { height: spacing.sm },
});

const createStyles = (c: Colors) => StyleSheet.create({
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
  },
  rowBody: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowBodyPressed: { opacity: 0.7 },
  headwordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  headword: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: c.textPrimary,
    flexShrink: 1,
  },
  reading: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  gloss: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  removeBtn: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  removeLabel: {
    fontSize: fontSize.md,
    color: c.textSecondary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: c.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
