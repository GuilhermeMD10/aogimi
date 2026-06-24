import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { useStatsActivity } from '../hooks/useStatsActivity';
import { Heatmap } from './Heatmap';
import { ReviewsPerDayChart } from './ReviewsPerDayChart';

// Activity tab: days studied counter, year-long heatmap, recent
// 30-day bar chart. No streak counter — the user explicitly asked for
// "no real streak, no pressure to login".
export function ActivityTab() {
  const c = useColors();
  const t = useT();
  const { data, loading, error } = useStatsActivity();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.fg} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.error, { color: c.fgMuted }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.heroBlock}>
        <Text style={[styles.heroNumber, { color: c.fg, fontFamily: fontFamily.displayBold }]}>
          {data.daysStudied}
        </Text>
        <Text style={[styles.heroLabel, { color: c.fgMuted }]}>
          {t('stats.daysStudied')}
        </Text>
      </View>

      <Section c={c} label={t('stats.heatmap')}>
        <Heatmap perDay={data.perDay} />
      </Section>

      <Section c={c} label={t('stats.recent')}>
        <ReviewsPerDayChart perDay={data.perDay} />
      </Section>
    </ScrollView>
  );
}

function Section({
  label,
  c,
  children,
}: {
  label: string;
  c: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.fgMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
  heroBlock: { alignItems: 'center', paddingVertical: spacing.md },
  heroNumber: { fontSize: 56, letterSpacing: -1.5, lineHeight: 60 },
  heroLabel: { fontSize: fontSize.md, marginTop: 4 },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
});
