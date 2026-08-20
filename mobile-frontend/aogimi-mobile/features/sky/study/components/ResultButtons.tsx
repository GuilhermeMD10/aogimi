import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
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
 */
const GRADES: { outcome: StudyOutcome; labelKey: string; color: string }[] = [
  { outcome: 'again', labelKey: 'study.again', color: '#B84238' },
  { outcome: 'hard',  labelKey: 'study.hard',  color: '#B8862B' },
  { outcome: 'good',  labelKey: 'study.good',  color: '#3B7A40' },
  { outcome: 'easy',  labelKey: 'study.easy',  color: '#2E5C8A' },
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
