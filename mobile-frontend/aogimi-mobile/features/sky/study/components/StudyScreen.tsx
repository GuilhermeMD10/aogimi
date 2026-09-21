import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/shared/components/Button';
import { Screen } from '@/shared/components/Screen';
import { LookupDrawers } from '@/features/dictionary/components/LookupDrawers';
import { useWordLookup } from '@/features/dictionary/hooks/useWordLookup';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';
import { useStudySession } from '../hooks/useStudySession';
import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { FinishScreen } from './FinishScreen';
import { GradeShelf } from './GradeShelf';
import { StudyCard } from './StudyCard';
import { StudyHeader } from './StudyHeader';
import { UndoButton } from './UndoButton';
import type { StudySessionConfig } from '../types';

/**
 * The action row and the grade shelf are different heights (48 and 64), and
 * the footer reserves the taller of the two on both faces. Without that the
 * card area grows by 16pt the moment the card is revealed, and the card
 * resizes under the user's thumb mid-turn.
 */
const FOOTER_H = 64;

/** Owner's adjustment: the answer row sits 10pt higher than the screen's own
 *  bottom padding would put it. */
const FOOTER_LIFT = 10;

type Props = {
  sessionSpec: StudySessionConfig;
  /** The deck's name — the header's label and, when the display preference
   *  asks for it, the card's eyebrow. Empty in a cross-deck session, where no
   *  single deck applies. */
  title?: string;
};

/**
 * The study session — `Study.dc.html`'s Front and Back, and the Finished
 * screen once the queue empties.
 *
 * Composition only; every concern lives in its own component or hook:
 *   useStudySession       — queue + algorithm + backend submit + undo
 *   useStudyDisplayPrefs  — preset + front/back toggles, cloud-synced
 *   useWordLookup         — the dictionary sheet raised over the card
 *   StudyHeader / StudyCard / GradeShelf / UndoButton / FinishScreen
 *
 * The session is parameterised by the spec passed in: single-deck modes
 * resolve via `deckIds`, cross-deck modes via `scope: 'all'`.
 *
 * ── It follows the theme ───────────────────────────────────────────────────
 * Unlike the sky it is launched from, which is pinned to Night by a
 * `ThemeScope`, this screen honours the user's day/night preference — the
 * owner's ruling, and the reason every Day value in the composition is built
 * rather than skipped.
 *
 * ── The card area scrolls, which the composition does not draw ─────────────
 * The front holds 420pt and centres; the back grows to its content, and a card
 * with three long glosses and a sentence can outrun a small phone. The
 * composition is static and draws no such case, so the area is a scroll view
 * whose content centres while it fits and scrolls when it does not. The
 * header and the action row keep their fixed heights either way.
 */
export function StudyScreen({ sessionSpec, title }: Props) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const router = useRouter();
  const session = useStudySession(sessionSpec);
  const { prefs } = useStudyDisplayPrefs();
  const lookup = useWordLookup();
  const deckName = title ?? '';

  if (session.loading) {
    return (
      <Screen padded>
        <View style={s.centred}>
          <ActivityIndicator color={p.accent} />
        </View>
      </Screen>
    );
  }

  if (session.error) {
    return (
      <Screen padded>
        <View style={s.centred}>
          <Text style={s.message}>{session.error}</Text>
          <Button label={t('study.backToDeck')} variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // Nothing was due. Not an error and not a finished session — there was no
  // session — so it gets its own face rather than a summary of zero cards.
  if (session.totalAtStart === 0) {
    return (
      <Screen padded>
        <View style={s.centred}>
          <Text style={s.message}>{t('study.nothingDue')}</Text>
          <Button label={t('study.backToDeck')} variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (session.finished) {
    return (
      <FinishScreen
        summary={session.summary}
        deckName={deckName}
        totalAtStart={session.totalAtStart}
        startedAt={session.startedAt}
        onStudyAgain={session.restart}
        onBackToDeck={() => router.back()}
      />
    );
  }

  const card = session.current!;
  const isFront = session.side === 'front';

  return (
    <Screen padded>
      <View style={s.root}>
        {/* Leaving early *finishes* — it does not discard. The session ends on
            the cards answered so far and lands on the same summary a session
            run to the last card does, which is the only honest reading of a
            session whose every grade was already written and posted. */}
        <StudyHeader
          deckLabel={deckName}
          reviewed={session.reviewed}
          total={session.totalAtStart}
          onBack={session.finishEarly}
        />

        <View style={s.area}>
          <StudyCard
            card={card}
            prefs={prefs}
            deckName={deckName}
            side={session.side}
            onFlip={session.flip}
            // `card.front` and not whatever face is showing — that column is
            // the Japanese headword whichever way the display preferences turn
            // the card, and the deinflector takes the surface form a
            // reader-started card carries (食べました → 食べる).
            onLookUp={() => lookup.open(card.front)}
          />
        </View>

        {/* Fixed height whichever face is up — see `FOOTER_H`. */}
        <View style={s.footer}>
          {isFront ? (
            <View style={s.actions}>
              <UndoButton onPress={session.undo} disabled={!session.canUndo} />
              <Button
                label={t('study.revealCard')}
                icon="eye"
                onPress={session.reveal}
                style={s.reveal}
              />
            </View>
          ) : (
            <GradeShelf onGrade={session.submit} />
          )}
        </View>
      </View>

      <LookupDrawers {...lookup.drawers} />
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          paddingTop: spacing.screenTop,
          paddingBottom: spacing.screenBottom + FOOTER_LIFT,
          gap: spacing.stackGap,
        },
        area: { flex: 1 },
        /** Always `FOOTER_H`, so the card area above it does not resize when
         *  the 48pt action row is replaced by the 64pt shelf. The action row
         *  sits at the bottom of the box, which is the edge the two faces have
         *  in common — aligning them at the top would float Reveal 16pt above
         *  where the shelf's own top lands. */
        footer: { height: FOOTER_H, justifyContent: 'flex-end' },
        actions: { flexDirection: 'row', gap: spacing.sm + 2 },
        reveal: { flex: 1 },

        centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
        message: { ...type.bodyMd, color: p.ink, textAlign: 'center' },
      }),
    [p],
  );
}
