import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from '@/shared/components/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { LookupDrawers } from '@/features/dictionary/components/LookupDrawers';
import { useWordLookup } from '@/features/dictionary/hooks/useWordLookup';
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
//   useWordLookup           — the dictionary sheet raised over the card
//   CardBody                — card content (kanji/meaning/cloze/etc.)
//   ResultButtons / UndoButton / FinishScreen
//
// The session is parameterised by the spec passed in: single-deck
// modes resolve via deckIds, cross-deck modes via scope='all'.
export function StudyScreen({ sessionSpec, title }: Props) {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const session = useStudySession(sessionSpec);
  const { prefs } = useStudyDisplayPrefs();
  const lookup = useWordLookup();
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
          <Touchable
          minTarget={false}
          hitSlop={10} onPress={() => router.back()} style={{ marginTop: spacing.md }}>
            <Text style={[styles.backLink, { color: c.fgMuted }]}>‹ {t('common.back')}</Text>
          </Touchable>
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
          <Touchable
          minTarget={false}
          hitSlop={10} onPress={() => router.back()} style={{ marginTop: spacing.md }}>
            <Text style={[styles.backLink, { color: c.fgMuted }]}>{t('study.backToDeck')}</Text>
          </Touchable>
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
        {/* Leaving early *finishes* — it does not discard. The session ends on
            the cards answered so far and lands on the same summary a session
            run to the last card does, which is the only honest reading of a
            session whose every grade was already written and posted. A ✕ said
            the opposite: that walking away threw the work out. */}
        <Touchable minTarget={false} hitSlop={12} onPress={session.finishEarly}>
          <Text style={[styles.finish, { color: c.fgMuted }]}>{t('study.finishSession')}</Text>
        </Touchable>
        <View style={[styles.track, { backgroundColor: c.bgSunken }]}>
          <View style={[styles.fill, { backgroundColor: c.fg, width: `${progressPct}%` }]} />
        </View>
        <Text style={[styles.count, { color: c.fgMuted }]}>
          {session.reviewed + 1} / {session.totalAtStart}
        </Text>
      </View>

      <Touchable
        minTarget={false} onPress={session.flip} style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: c.bgElev, borderColor: c.border }]}>
          <CardBody card={card} prefs={prefs} deckName={deckName} side={session.side} />
        </View>
      </Touchable>

      <View style={styles.footer}>
        {isFront ? (
          <Button label={t('study.tapToReveal')} onPress={session.reveal} full />
        ) : (
          <>
            <ResultButtons onResult={session.submit} />
            {/* Back side only: the entry the sheet opens *is* the answer, so
                offering it on the front would hand the card away rather than
                look it up. `card.front` and not whatever face is showing —
                that column is the Japanese headword whichever way the display
                prefs turn the card, and the deinflector takes the surface form
                a reader-started card carries (食べました → 食べる). */}
            <Touchable
              minTarget={false}
              hitSlop={8}
              onPress={() => lookup.open(card.front)}
              accessibilityRole="button"
              accessibilityLabel={t('study.lookUp')}
              style={styles.lookUp}
            >
              <Feather name="book-open" size={14} color={c.fgMuted} />
              <Text style={[styles.lookUpLabel, { color: c.fgMuted }]}>{t('study.lookUp')}</Text>
            </Touchable>
          </>
        )}
        <UndoButton onPress={session.undo} disabled={!session.canUndo} />
      </View>

      <LookupDrawers {...lookup.drawers} />
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
  finish: { fontSize: fontSize.sm, fontWeight: '600' },
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
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  lookUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  lookUpLabel: { fontSize: fontSize.sm, fontWeight: '500' },
});
