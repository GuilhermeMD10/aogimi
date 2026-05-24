import { useState } from 'react';
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
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useStudySession } from '../hooks/useStudySession';
import { StudySummary } from './StudySummary';

type Props = { deckId: string };

export function StudyScreen({ deckId }: Props) {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const [showContext, setShowContext] = useState(true);
  const session = useStudySession(deckId);

  const progressPct =
    session.totalAtStart > 0
      ? Math.min(100, (session.reviewed / session.totalAtStart) * 100)
      : 0;

  if (session.loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.fg} />
        </View>
      </SafeAreaView>
    );
  }

  if (session.error || !session.deck) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={{ color: c.fg }}>{session.error ?? 'Session not available'}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: 12 }}>
            <Text style={{ color: c.fgMuted }}>‹ Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (session.totalAtStart === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <Text style={{ color: c.fg, fontSize: fontSize.lg }}>No cards to study yet.</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginTop: 16 }}>
            <Text style={{ color: c.fgMuted }}>Back to deck</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (session.finished) {
    return (
      <StudySummary
        reviewed={session.reviewed}
        known={session.known}
        toReview={session.toReview}
        onStudyAgain={session.restart}
        onBackToDeck={() => router.back()}
      />
    );
  }

  const card = session.current!;
  const isFront = session.side === 'front';

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

      <View style={styles.body}>
        <View style={styles.contextRow}>
          <Pressable
            onPress={() => setShowContext((v) => !v)}
            style={[
              styles.pill,
              { backgroundColor: c.bgElev, borderColor: c.border },
            ]}
            hitSlop={4}
          >
            <Text style={[styles.pillText, { color: c.fg }]}>Context</Text>
            <View style={[styles.toggle, { backgroundColor: showContext ? c.fg : c.borderStrong }]}>
              <View
                style={[
                  styles.knob,
                  { left: showContext ? 11 : 1, backgroundColor: c.bgElev },
                ]}
              />
            </View>
          </Pressable>
        </View>

        <Pressable onPress={session.flip} style={styles.cardWrap}>
          <View style={[styles.card, { backgroundColor: c.bgElev, borderColor: c.border }]}>
            <Text style={[styles.front, { color: c.fg }]}>{card.front}</Text>
            {!isFront && (
              <>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                {card.reading.length > 0 && (
                  <Text style={[styles.reading, { color: c.fgMuted }]}>{card.reading}</Text>
                )}
                <Text style={[styles.back, { color: c.fg }]}>{card.back}</Text>
              </>
            )}
          </View>
        </Pressable>

        {showContext && card.notes.length > 0 && (
          <View
            style={[
              styles.contextBox,
              {
                backgroundColor: c.bgSunken,
                borderLeftColor: c.fg,
              },
            ]}
          >
            <Text style={[styles.contextKicker, { color: c.fgMuted }]}>Context</Text>
            <Text style={[styles.contextText, { color: c.fg }]}>{card.notes}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {isFront ? (
          <Button label={t('study.tapToReveal')} onPress={session.reveal} full />
        ) : (
          <View style={styles.ratingRow}>
            <Button
              label={t('study.dontKnow')}
              onPress={session.markUnknown}
              variant="secondary"
              full
              style={{ flex: 1 }}
            />
            <Button
              label={t('study.know')}
              onPress={session.markKnown}
              full
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
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
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  contextRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontSize: fontSize.xs + 1, fontWeight: '500' },
  toggle: { width: 24, height: 14, borderRadius: 99, position: 'relative' },
  knob: {
    position: 'absolute',
    top: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardWrap: { flex: 1, justifyContent: 'center' },
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
  front: {
    fontFamily: fontFamily.jp,
    fontSize: 56,
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: { width: 60, height: StyleSheet.hairlineWidth, marginVertical: 10 },
  reading: { fontFamily: fontFamily.jp, fontSize: 20 },
  back: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 6,
  },
  contextBox: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
  },
  contextKicker: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: 6,
  },
  contextText: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.sm + 1,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  ratingRow: { flexDirection: 'row', gap: 10 },
});
