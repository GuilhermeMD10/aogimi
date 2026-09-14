import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { gradeFeedback, type GradeFeel } from '@/lib/haptics';
import { useT } from '@/lib/i18n/I18nContext';
import { fontSize, radius } from '@/theme/tokens';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

/**
 * The four FSRS grades, in Anki's order: Again · Hard · Good · Easy.
 *
 * **Good is why this row has four buttons and not three.** FSRS is fitted on a
 * four-grade distribution in which Good is the dominant success grade; with
 * three buttons there is no neutral success, so the third one had to stand in
 * for it and emit Easy on every correct answer. That applies the `w16` easy
 * bonus each time and pins difficulty at its floor — the `all Easy` sequence in
 * `scripts/verify-fsrs.mts` shows where it ends up: 8 → 66 → 397 → 1875 day
 * intervals. Correct arithmetic on the wrong grade.
 *
 * Labelling a button "Easy" while emitting Good was rejected outright: the
 * label and the logged grade would disagree, which poisons `card_reviews` for
 * any future parameter fit.
 *
 * Colours are the grade's meaning, not decoration — green sits on Good, where
 * "correct" belongs, and blue (not green) on Easy so it doesn't read as the
 * default success. The palette is stated inline rather than tokenised because
 * these four are semantic to grading and shouldn't drift with the theme; the
 * design handoff may restyle the row, but Again must not stop being the alarm.
 *
 * `feel` is the same idea in the other sense the row is read through. Grading a
 * queue is four buttons pressed hundreds of times, mostly without looking down,
 * so each one answers with its own weight: crisp and abrupt on Again, softening
 * step by step to barely-there on Easy. It rides the *same* ordering the
 * colours do, which is what makes it learnable rather than merely varied — see
 * `GradeFeel` for why none of them is heavy.
 */
const GRADES: { outcome: StudyOutcome; labelKey: string; color: string; feel: GradeFeel }[] = [
  { outcome: 'again', labelKey: 'study.again', color: '#B84238', feel: 'firm' },
  { outcome: 'hard',  labelKey: 'study.hard',  color: '#B8862B', feel: 'solid' },
  { outcome: 'good',  labelKey: 'study.good',  color: '#3B7A40', feel: 'light' },
  { outcome: 'easy',  labelKey: 'study.easy',  color: '#2E5C8A', feel: 'soft' },
];

export function ResultButtons({ onResult, disabled }: Props) {
  const t = useT();
  return (
    <View style={styles.row}>
      {GRADES.map((g) => (
        <Touchable
          minTarget={false}
          key={g.outcome}
          onPress={() => onResult(g.outcome)}
          // The grade's own weight replaces Touchable's shared Light tick — two
          // haptics on one press reads as a stutter, and the generic one would
          // drown the distinction these four exist to make. Press-*in*, like
          // the one it replaces, so it lands with the finger.
          haptic={false}
          onPressIn={() => gradeFeedback(g.feel)}
          disabled={disabled}
          style={[
            styles.button,
            { backgroundColor: g.color, opacity: disabled ? 0.4 : 1 },
          ]}
        >
          <Text style={styles.label} numberOfLines={1}>
            {t(g.labelKey)}
          </Text>
        </Touchable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
