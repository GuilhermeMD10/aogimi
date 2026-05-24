import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';

type Props = {
  reviewed: number;
  known: number;
  toReview: number;
  onStudyAgain: () => void;
  onBackToDeck: () => void;
};

export function StudySummary({
  reviewed,
  known,
  toReview,
  onStudyAgain,
  onBackToDeck,
}: Props) {
  const c = useColors();
  const t = useT();
  const pct = reviewed > 0 ? Math.round((known / reviewed) * 100) : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={[styles.checkWrap, { backgroundColor: c.accentSoft }]}>
            <Text style={[styles.check, { color: c.fg }]}>✓</Text>
          </View>
          <Text style={[styles.title, { color: c.fg }]}>{t('study.summaryTitle')}</Text>
          <Text style={[styles.subtitle, { color: c.fgMuted }]}>
            {t('study.summaryCards', { reviewed, pct })}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Reviewed" value={String(reviewed)} />
          <Stat label="Known" value={String(known)} />
          <Stat label="To review" value={String(toReview)} />
        </View>

        <View style={styles.actions}>
          <Button label={t('study.studyAgain')} onPress={onStudyAgain} full />
          <Button
            label={t('study.backToDeck')}
            onPress={onBackToDeck}
            variant="secondary"
            full
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.bgElev, borderColor: c.border }]}>
      <Text style={[styles.statValue, { color: c.fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.fgMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  top: { alignItems: 'center', marginTop: spacing.xxl },
  checkWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 52, lineHeight: 52, fontWeight: '700' },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 32,
    letterSpacing: -0.5,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: spacing.xxl,
  },
  stat: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fontFamily.displayBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 'auto',
  },
});
