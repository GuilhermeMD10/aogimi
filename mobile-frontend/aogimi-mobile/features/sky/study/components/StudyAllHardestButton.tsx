import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useDueCounts } from '@/features/sky/stage/hooks/useDueCounts';

// Top-of-Decks-list CTA. Single-tap entry into a cross-deck session
// using the `hardest_all_decks` mode. No config needed — the algorithm
// pools every owned deck and surfaces the hardest cards first.
//
// It reports the **due** count rather than just offering to study, because the
// session it opens is due-only: with nothing due there is nothing to serve, and
// a button that opened an empty session would read as a bug. Practice — study
// with nothing due, grading into the void on purpose — is a separate affordance
// that arrives with the sky stage.
export function StudyAllHardestButton() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { counts, loading } = useDueCounts();

  const nothingDue = !loading && counts.total === 0;

  return (
    <Pressable
      onPress={() => router.push('/sky/study')}
      disabled={nothingDue}
      style={[
        styles.root,
        {
          backgroundColor: c.bgElev,
          borderColor: c.borderStrong,
          opacity: nothingDue ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.icon, { color: c.fg }]}>⚡</Text>
        <View style={styles.text}>
          <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.ui }]}>
            {t('decks.studyAllHardest')}
          </Text>
          <Text style={[styles.subtitle, { color: c.fgMuted }]}>
            {loading
              ? t('decks.studyAllHardestHint')
              : nothingDue
                ? t('study.nothingDue')
                : t('study.dueCount', { n: String(counts.total) })}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: c.fgMuted }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.md, fontWeight: '600', letterSpacing: -0.2 },
  subtitle: { fontSize: fontSize.xs, lineHeight: 16 },
  chevron: { fontSize: 24, lineHeight: 26 },
});
