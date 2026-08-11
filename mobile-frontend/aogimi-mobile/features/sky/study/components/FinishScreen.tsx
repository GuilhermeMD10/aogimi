import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { BreakdownBar } from './BreakdownBar';
import { StateChangesList } from './StateChangesList';
import { HardestInSessionList } from './HardestInSessionList';
import type { SessionSummary } from '../types';

type Props = {
  summary: SessionSummary;
  onStudyAgain: () => void;
  onBackToDeck: () => void;
};

// End-of-session summary screen. Hero count → breakdown bar (where the
// cards landed) → state changes (what got promoted / regressed) →
// hardest list (cards the user struggled with). CTAs pinned to the
// bottom.
//
// Each section renders only when it has data — a session of one Easy
// review collapses to just the hero + breakdown.
export function FinishScreen({ summary, onStudyAgain, onBackToDeck }: Props) {
  const c = useColors();
  const t = useT();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.heroNumber, { color: c.fg, fontFamily: fontFamily.displayBold }]}>
            {summary.uniqueCards}
          </Text>
          <Text style={[styles.heroLabel, { color: c.fgMuted }]}>
            {t('study.finish.cardsReviewed')}
          </Text>
        </View>

        <Section c={c}>
          <BreakdownBar entries={summary.perCard} />
        </Section>

        <Section c={c} label={t('study.finish.progression')}>
          <StateChangesList entries={summary.perCard} />
        </Section>

        <Section c={c} label={t('study.finish.hardest')}>
          <HardestInSessionList entries={summary.perCard} />
        </Section>
      </ScrollView>

      <View style={styles.actions}>
        <Button label={t('study.studyAgain')} onPress={onStudyAgain} full />
        <Button label={t('study.backToDeck')} onPress={onBackToDeck} variant="secondary" full />
      </View>
    </SafeAreaView>
  );
}

function Section({
  label,
  c,
  children,
}: {
  label?: string;
  c: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {label && (
        <Text style={[styles.sectionLabel, { color: c.fgMuted }]}>{label}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  heroNumber: {
    fontSize: 64,
    letterSpacing: -1.5,
    lineHeight: 70,
  },
  heroLabel: {
    fontSize: fontSize.md,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
