import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize } from '@/theme/tokens';
import type { DeckCardStats } from '@/features/sky/stage/lib/cardLocalState';

type Props = {
  stats: DeckCardStats;
  /** 'inline' — single subtle line for the deck tile; 'expanded' — a
   *  larger row for the deck detail page. */
  variant?: 'inline' | 'expanded';
};

// One-line summary of card counts per SRS state. Skips zero-count
// buckets to keep the row tight on small tiles. Colors mirror the
// chip palette in CardGridItem so the same state reads the same
// everywhere.
export function StateBreakdown({ stats, variant = 'inline' }: Props) {
  const c = useColors();
  const t = useT();

  if (stats.total === 0) return null;

  const buckets = [
    { count: stats.mastered, label: t('study.state.mastered'), color: c.success },
    { count: stats.learned,  label: t('study.state.learned'),  color: c.success },
    { count: stats.met,      label: t('study.state.met'),      color: c.warning },
    { count: stats.new,      label: t('study.state.new'),      color: c.fgSubtle },
  ].filter((b) => b.count > 0);

  if (buckets.length === 0) return null;

  const fontSizeForVariant = variant === 'expanded' ? fontSize.sm : fontSize.xs;

  return (
    <View style={styles.row}>
      {buckets.map((b, i) => (
        <Text key={b.label} style={[styles.item, { color: b.color, fontSize: fontSizeForVariant }]}>
          {b.count} {b.label}
          {i < buckets.length - 1 && (
            <Text style={[styles.sep, { color: c.fgSubtle }]}> · </Text>
          )}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  item: {
    fontFamily: fontFamily.ui,
    fontVariant: ['tabular-nums'],
  },
  sep: {
    // Inherits fontSize from the wrapping Text item.
  },
});
