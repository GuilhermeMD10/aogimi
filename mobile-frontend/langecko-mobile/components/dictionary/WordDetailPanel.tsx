import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { fetchWordDetails } from '@/lib/api';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import type { WordDetails, KanjiInfo } from '@/lib/types';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useSavedWords } from './useSavedWords';

interface WordDetailPanelProps {
  id: string;
  onBack: () => void;
  onKanjiPress: (char: string) => void;
}

/**
 * Word detail view — rendered inline inside the Dictionary drawer.
 *
 * The parent supplies navigation callbacks (`onBack`, `onKanjiPress`) so the
 * same UI works whether it's invoked from inside the drawer or, one day,
 * from a deep link.
 */
export function WordDetailPanel({ id, onBack, onKanjiPress }: WordDetailPanelProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { data, loading, error } = useFetchWithAbort<WordDetails>(
    (signal) => fetchWordDetails(id, signal),
    [id],
    { enabled: !!id },
  );

  const { isSaved, toggleSaved } = useSavedWords();
  const saved = isSaved(id);

  const onToggleSave = () => {
    if (!data) return;
    const { word } = data;
    const headword = word.kanji[0] ?? word.readings[0] ?? String(word.id);
    const reading  = word.readings[0];
    // Up to three English glosses, joined — matches the row preview in the
    // Saved list so users recognise what they saved at a glance.
    const glosses = word.meanings
      .filter((m) => m.lang === 'eng')
      .slice(0, 3)
      .map((m) => m.meaning)
      .join('; ') || undefined;
    toggleSaved({ id: word.id, headword, reading, glosses });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {/* A bit of breathing room between the status bar and the back button
       *  so taps land squarely on the Pressable (on iOS the OS claims
       *  touches in the status bar area for scroll-to-top). */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={16}
          android_ripple={{ color: colors.border, borderless: true }}
          style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
        >
          <Text style={styles.back}>← Back to search</Text>
        </Pressable>
        {data ? (
          <Pressable
            onPress={onToggleSave}
            hitSlop={12}
            android_ripple={{ color: colors.border, borderless: true }}
            accessibilityLabel={saved ? 'Remove from saved words' : 'Save this word'}
            style={({ pressed }) => [
              styles.saveButton,
              saved && styles.saveButtonActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.saveIcon, saved && styles.saveIconActive]}>
              {saved ? '★' : '☆'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? <Text style={styles.muted}>Loading…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {data ? <WordBody data={data} onKanjiPress={onKanjiPress} styles={styles} rippleColor={colors.border} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function WordBody({
  data,
  onKanjiPress,
  styles,
  rippleColor,
}: {
  data: WordDetails;
  onKanjiPress: (char: string) => void;
  styles: ReturnType<typeof createStyles>;
  rippleColor: string;
}) {
  const { word, kanjis } = data;
  const headword = word.kanji[0] ?? word.readings[0] ?? '—';
  const altKanji = word.kanji.slice(1);

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.headwordRow}>
          <Text style={styles.headword}>{headword}</Text>
          {word.is_common ? <Text style={styles.common}>common</Text> : null}
        </View>
        {word.readings.length > 0 ? (
          <Text style={styles.readings}>{word.readings.join('、')}</Text>
        ) : null}

        {altKanji.length > 0 ? (
          <Text style={styles.alt}>
            <Text style={styles.altLabel}>Also written: </Text>
            {altKanji.join('、')}
          </Text>
        ) : null}

        <Text style={styles.sectionHeading}>Meanings</Text>
        {word.meanings.length > 0 ? (
          word.meanings.map((m, i) => (
            <View key={`${m.lang}-${i}`} style={styles.meaningRow}>
              <Text style={styles.meaningIdx}>{i + 1}.</Text>
              <View style={styles.meaningBody}>
                <Text style={styles.meaningText}>{m.meaning}</Text>
                {m.pos ? <Text style={styles.pos}>{m.pos}</Text> : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>—</Text>
        )}
      </Card>

      {kanjis.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.cardHeading}>Kanji breakdown ({kanjis.length})</Text>
          <Text style={styles.cardSubheading}>Tap a character to search for it.</Text>
          <View style={styles.kanjiList}>
            {kanjis.map((k) => (
              <KanjiTile key={k.literal} info={k} onPress={() => onKanjiPress(k.literal)} styles={styles} rippleColor={rippleColor} />
            ))}
          </View>
        </Card>
      ) : null}
    </>
  );
}

function KanjiTile({ info, onPress, styles, rippleColor }: { info: KanjiInfo; onPress: () => void; styles: ReturnType<typeof createStyles>; rippleColor: string }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [styles.kanjiTile, pressed && styles.kanjiTilePressed]}
    >
      <View style={styles.kanjiHeader}>
        <Text style={styles.kanjiLiteral}>{info.literal}</Text>
        <View style={styles.kanjiStats}>
          <Text style={styles.kanjiStat}>Grade: {info.grade ?? '—'}</Text>
          <Text style={styles.kanjiStat}>Strokes: {info.stroke_count ?? '—'}</Text>
          <Text style={styles.kanjiStat}>Radical: {info.radical ?? '—'}</Text>
        </View>
      </View>
      <Text style={styles.kanjiMeanings}>{info.meanings.join(', ') || '—'}</Text>
      <Text style={styles.kanjiReading}>
        <Text style={styles.kanjiLabel}>On: </Text>
        {info.on_readings.join('、') || '—'}
      </Text>
      <Text style={styles.kanjiReading}>
        <Text style={styles.kanjiLabel}>Kun: </Text>
        {info.kun_readings.join('、') || '—'}
      </Text>
    </Pressable>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    // Sits BELOW the safe-area inset (status bar). The extra top margin gives
    // the back button some visual breathing room instead of hugging the notch.
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgSurface,
  },
  saveButtonActive: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  saveIcon: {
    fontSize: fontSize.lg,
    color: c.textSecondary,
    lineHeight: fontSize.lg * 1.1,
  },
  saveIconActive: {
    color: c.accentDark,
  },
  backPressed: { opacity: 0.55 },
  back: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl },

  card: { marginTop: spacing.md },

  headwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headword: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: c.textPrimary,
  },
  common: {
    marginLeft: 'auto',
    fontSize: fontSize.xs,
    color: c.accentDark,
  },
  readings: {
    marginTop: spacing.xs,
    fontSize: fontSize.md,
    color: c.textSecondary,
  },
  alt: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  altLabel: { fontWeight: '500', color: c.textPrimary },

  sectionHeading: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
    marginBottom: spacing.xs,
  },
  meaningRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  meaningIdx: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    minWidth: 18,
  },
  meaningBody: { flex: 1 },
  meaningText: {
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  pos: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    color: c.textSecondary,
    marginTop: 1,
  },

  cardHeading: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.serifSemiBold,
    color: c.textPrimary,
  },
  cardSubheading: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  kanjiList: { marginTop: spacing.sm, gap: spacing.sm },

  kanjiTile: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kanjiTilePressed: { opacity: 0.6 },
  kanjiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  kanjiLiteral: {
    fontSize: fontSize.display,
    color: c.textPrimary,
  },
  kanjiStats: { gap: 2 },
  kanjiStat: {
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  kanjiMeanings: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  kanjiReading: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  kanjiLabel: { fontWeight: '500', color: c.textPrimary },

  muted: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  error: {
    fontSize: fontSize.sm,
    color: c.error,
  },
});
