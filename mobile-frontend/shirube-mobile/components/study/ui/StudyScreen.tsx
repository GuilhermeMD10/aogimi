import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontSize, spacing } from '@/theme/tokens';
import { useStudySession } from '../hooks/useStudySession';
import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { ResultButtons } from './ResultButtons';
import { UndoButton } from './UndoButton';
import { FinishScreen } from './FinishScreen';
import { CardBody } from './CardBody';
import type { StudySessionConfig } from '../types';

type Props = {
  sessionSpec: StudySessionConfig;
  /** Front-side label for the `deckName` toggle. Empty disables it
   *  (used in cross-deck mode where no single deck name applies). */
  title?: string;
};

// Top-level study session screen. Composition only — every concern
// lives in its own component or hook:
//   useStudySession         — queue + algorithm + backend submit + undo
//   useStudyDisplayPrefs    — preset + front/back toggles, cloud-synced
//   CardBody                — card content (kanji/meaning/cloze/etc.)
//   ResultButtons / UndoButton / FinishPlaceholder
//
// The session is parameterised by the spec passed in: single-deck
// modes resolve via deckIds, cross-deck modes via scope='all'.
export function StudyScreen({ sessionSpec, title }: Props) {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const session = useStudySession(sessionSpec);
  const { prefs } = useStudyDisplayPrefs();
  const deckName = title ?? '';

  if (session.loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      </SafeAreaView>
    );
  }

  if (session.error) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[styles.message, { color: c.fg }]}>{session.error}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: spacing.md }}>
            <Text style={[styles.backLink, { color: c.fgMuted }]}>‹ {t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (session.totalAtStart === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={[styles.message, { color: c.fg, fontSize: fontSize.lg }]}>
            {t('home.empty')}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: spacing.md }}>
            <Text style={[styles.backLink, { color: c.fgMuted }]}>{t('study.backToDeck')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (session.finished) {
    return (
      <FinishScreen
        summary={session.summary}
        onStudyAgain={session.restart}
        onBackToDeck={() => router.back()}
      />
    );
  }

  const card = session.current!;
  const isFront = session.side === 'front';
  const progressPct =
    session.totalAtStart > 0
      ? Math.min(100, (session.reviewed / session.totalAtStart) * 100)
      : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[styles.close, { color: c.fg }]}>✕</Text>
        </Pressable>
        <View style={[styles.track, { backgroundColor: c.bgSunken }]}>
          <View style={[styles.fill, { backgroundColor: c.fg, width: `${progressPct}%` }]} />
        </View>
        <Text style={[styles.count, { color: c.fgMuted }]}>
          {session.reviewed + 1} / {session.totalAtStart}
        </Text>
      </View>

      <Pressable onPress={session.flip} style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: c.bgElev, borderColor: c.border }]}>
          <CardBody card={card} prefs={prefs} deckName={deckName} side={session.side} />
        </View>
      </Pressable>

      <View style={styles.footer}>
        {isFront ? (
          <Button label={t('study.tapToReveal')} onPress={session.reveal} full />
        ) : (
          <ResultButtons onResult={session.submit} />
        )}
        <UndoButton onPress={session.undo} disabled={!session.canUndo} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: { fontSize: fontSize.md, textAlign: 'center' },
  backLink: { fontSize: fontSize.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  close: { fontSize: 20, lineHeight: 22 },
  track: { flex: 1, height: 4, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  count: {
    fontSize: fontSize.xs + 1,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    minWidth: 56,
    textAlign: 'right',
  },
  cardWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  card: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
