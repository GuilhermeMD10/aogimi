import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { CloudSyncIcon } from '@/shared/icons/sync-icons';
import { fontFamily, fontSize, palette, radius, spacing } from '@/theme/tokens';
import { NIGHT } from '../lib/nightChrome';

/**
 * The outer tier's one action cluster: study what's due, and add a deck.
 *
 * **The study button reports the due count rather than just offering to study**,
 * the rule `StudyAllHardestButton` already established: since FSRS-6 a review
 * only counts if the card is due, so a session opened with nothing due hands
 * over cards that cannot earn anything — the work looks identical and vanishes.
 * With `dueCount === 0` the button says so and refuses.
 *
 * **There is no "Study ahead" here, unlike the web.** Over there practice is an
 * overlay backed by `useStudySession`'s `local` source — grades move the session
 * bar and touch nothing else. Mobile's `useStudySession` has no such source
 * (`StudySessionConfig` is scope/mode/limit/dueOnly), so the affordance would
 * have to be built, not wired. Deferred deliberately rather than faked; noted in
 * TODO.md.
 *
 * **Sync-now is carried over from `DecksListScreen`**, the screen this replaces.
 * It is the only manual push in the app, so dropping it with that screen would
 * have quietly removed a feature rather than redesigned one. There is no
 * `canSync` prop guarding it: the old screen needed one because it rendered for
 * signed-out users too, and this cluster does not — `SkyStageView` returns the
 * sign-in prompt before any of this mounts, so an account is already given.
 */

type Props = {
  /** `null` while the count is in flight — the label stays neutral. */
  dueCount: number | null;
  atDeckQuota: boolean;
  syncing: boolean;
  /** Something is queued to push; the button's edge lights to say so. */
  hasPending: boolean;
  onStudyDue: () => void;
  onCreateDeck: () => void;
  onSync: () => void;
};

export function StageActions({
  dueCount,
  atDeckQuota,
  syncing,
  hasPending,
  onStudyDue,
  onCreateDeck,
  onSync,
}: Props) {
  const nothingDue = dueCount === 0;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onStudyDue}
        disabled={nothingDue}
        accessibilityRole="button"
        accessibilityState={{ disabled: nothingDue }}
        accessibilityLabel={
          dueCount === null
            ? 'Study'
            : nothingDue
              ? 'Nothing due to study'
              : `Study ${dueCount} due`
        }
        style={[styles.study, { opacity: nothingDue ? 0.45 : 1 }]}
      >
        <Feather name="zap" size={15} color={palette.btnInk} />
        <Text style={styles.studyLabel}>
          {dueCount === null ? 'Study' : nothingDue ? 'Nothing due' : `Study ${dueCount} due`}
        </Text>
      </Pressable>

      <Pressable
        onPress={onSync}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityState={{ disabled: syncing, busy: syncing }}
        accessibilityLabel="Sync now"
        style={[
          styles.iconBtn,
          {
            borderColor: hasPending ? palette.ink : palette.bdA,
            opacity: syncing ? 0.5 : 1,
          },
        ]}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={palette.ink} />
        ) : (
          // The one green in the app: "synced" is a status, not a palette
          // colour, and it is the same hex the library's SyncPill uses.
          <CloudSyncIcon size={18} color="#2E9F58" />
        )}
      </Pressable>

      <Pressable
        onPress={onCreateDeck}
        disabled={atDeckQuota}
        accessibilityRole="button"
        accessibilityState={{ disabled: atDeckQuota }}
        accessibilityLabel={atDeckQuota ? 'Deck limit reached' : 'New deck'}
        style={[styles.iconBtn, { opacity: atDeckQuota ? 0.45 : 1 }]}
      >
        <Feather name="plus" size={18} color={palette.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  study: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: palette.btn,
  },
  studyLabel: {
    color: palette.btnInk,
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: NIGHT.glass,
    borderColor: palette.bdA,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
