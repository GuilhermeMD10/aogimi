import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, spacing } from '@/theme/tokens';
import type { KanjiInfo } from '@/lib/types';

export const KanjiPanel = memo(function KanjiPanel({ info }: { info: KanjiInfo }) {
  const styles = useThemedStyles(createStyles);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.literal}>{info.literal}</Text>
        <View style={styles.statsCol}>
          <Text style={styles.statLine}>Grade: {info.grade ?? '—'}</Text>
          <Text style={styles.statLine}>Strokes: {info.stroke_count ?? '—'}</Text>
          <Text style={styles.statLine}>Radical: {info.radical ?? '—'}</Text>
        </View>
      </View>

      <LabelLine label="Meanings" value={info.meanings.join(', ') || '—'} styles={styles} />
      <LabelLine label="On"       value={info.on_readings.join('、') || '—'} styles={styles} />
      <LabelLine label="Kun"      value={info.kun_readings.join('、') || '—'} styles={styles} />
    </Card>
  );
});

function LabelLine({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <Text style={styles.line}>
      <Text style={styles.lineLabel}>{label}: </Text>
      <Text style={styles.lineValue}>{value}</Text>
    </Text>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  card: { marginTop: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  literal: {
    fontSize: fontSize.display,
    color: c.textPrimary,
  },
  statsCol: { gap: 2 },
  statLine: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  line: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
  },
  lineLabel: {
    fontWeight: '500',
    color: c.textPrimary,
  },
  lineValue: { color: c.textPrimary },
});
