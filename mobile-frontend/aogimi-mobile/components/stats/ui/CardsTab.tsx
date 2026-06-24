import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useStatsCards } from '../hooks/useStatsCards';
import type { CardRecord } from '@/components/decks/types';

// Cards tab: state distribution table + hardest 20 list. The user
// picked "simple table list" over a donut chart in the design pass.
export function CardsTab() {
  const c = useColors();
  const t = useT();
  const { data, loading, error } = useStatsCards();

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

  const stateRows: { key: 'new' | 'seen' | 'learned' | 'mastered'; n: number; color: string }[] = [
    { key: 'new',      n: data.byState.new,      color: c.fgSubtle },
    { key: 'seen',     n: data.byState.seen,     color: c.warning },
    { key: 'learned',  n: data.byState.learned,  color: c.success },
    { key: 'mastered', n: data.byState.mastered, color: c.success },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Section c={c} label={t('stats.distribution')}>
        <View style={[styles.table, { borderColor: c.border }]}>
          {stateRows.map((r, i) => (
            <View
              key={r.key}
              style={[
                styles.tableRow,
                {
                  borderTopColor: c.border,
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.stateName, { color: r.color }]}>
                {t(`study.state.${r.key}`)}
              </Text>
              <Text style={[styles.stateCount, { color: c.fg }]}>{r.n}</Text>
            </View>
          ))}
          <View
            style={[
              styles.tableRow,
              styles.totalRow,
              { borderTopColor: c.borderStrong, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text style={[styles.totalLabel, { color: c.fgMuted }]}>{t('stats.total')}</Text>
            <Text style={[styles.totalCount, { color: c.fg }]}>{data.total}</Text>
          </View>
        </View>
      </Section>

      <Section c={c} label={t('stats.hardestCards')}>
        {data.hardest.length === 0 ? (
          <Text style={[styles.empty, { color: c.fgSubtle }]}>{t('stats.noHardest')}</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {data.hardest.map((card) => (
              <HardCardRow key={card.id} card={card} />
            ))}
          </View>
        )}
      </Section>
    </ScrollView>
  );
}

function HardCardRow({ card }: { card: CardRecord }) {
  const c = useColors();
  const againCount = (card.last_outcomes.match(/A/g) || []).length;
  return (
    <View style={[styles.cardRow, { backgroundColor: c.bgElev, borderColor: c.border }]}>
      <View style={styles.cardText}>
        <Text style={[styles.cardFront, { color: c.fg }]} numberOfLines={1}>
          {card.front}
        </Text>
        {card.back.length > 0 && (
          <Text style={[styles.cardBack, { color: c.fgMuted }]} numberOfLines={1}>
            {card.back}
          </Text>
        )}
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.diff, { color: c.warning }]}>
          D {(card.difficulty * 100).toFixed(0)}
        </Text>
        {againCount > 0 && (
          <Text style={[styles.again, { color: c.fgMuted }]}>{againCount}A</Text>
        )}
      </View>
    </View>
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
  section: { gap: 10 },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  table: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stateName: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.ui,
    textTransform: 'capitalize',
  },
  stateCount: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.ui,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {},
  totalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  totalCount: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.ui,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardFront: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  cardBack: { fontSize: fontSize.xs + 1, marginTop: 2 },
  cardMeta: { alignItems: 'flex-end' },
  diff: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: fontFamily.ui,
  },
  again: {
    fontSize: fontSize.xs,
    marginTop: 2,
    fontFamily: fontFamily.ui,
  },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.md },
});
