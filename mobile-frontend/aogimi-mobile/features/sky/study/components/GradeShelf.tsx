import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable, alpha } from '@/shared/components';
import { gradeFeedback, type GradeFeel } from '@/lib/haptics';
import { usePalette, useTheme, radius, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import type { StudyOutcome } from '../types';

/** DESIGN.md's grade tile. */
const TILE_H = 64;

/**
 * DESIGN.md's tinted tile: fill at 0.18 and border at 0.45 on Night, 0.12 and
 * 0.40 on Day. A light canvas needs less wash behind a label to separate it,
 * and Night's alphas there would read as four coloured blocks rather than four
 * tinted tiles.
 */
const TINT = {
  night: { fill: 0.18, border: 0.45 },
  day: { fill: 0.12, border: 0.4 },
} as const;

/**
 * **The four FSRS grades** — `Study.dc.html`'s shelf: four equal tiles, 64pt,
 * each a tint of its own grade colour with a matching border and label.
 *
 * ── Why four and not three ─────────────────────────────────────────────────
 * FSRS is fitted on a four-grade distribution in which Good is the dominant
 * success grade. With three buttons there is no neutral success, so the third
 * one had to stand in for it and emit Easy on every correct answer — which
 * applies the `w16` easy bonus each time and pins difficulty at its floor.
 * The `all Easy` sequence in `scripts/verify-fsrs.mts` shows where that ends
 * up: 8 → 66 → 397 → 1875 day intervals. Correct arithmetic on the wrong
 * grade. Labelling a button "Easy" while emitting Good was rejected outright:
 * the label and the logged grade would disagree, which poisons `card_reviews`
 * for any future parameter fit.
 *
 * ── No intervals under the labels ──────────────────────────────────────────
 * The composition prints one under each grade (`1m · 10m · 1d · 4d`). The
 * owner's ruling for this pass is that the shelf carries labels alone. Those
 * four figures are FSRS's *defaults for a brand-new card* and are wrong for
 * almost every card a session actually serves, and the honest alternative —
 * previewing each grade through `applyOutcome` per card — was not the ask.
 * `type.labelInterval` stays in the token set for whoever builds it.
 *
 * ── The colours are the meaning ────────────────────────────────────────────
 * They come from the palette's `srs*` group, which is semantic rather than
 * decorative and is darkened ~20% in Day so the labels hold on a white
 * canvas. Again must not stop being the alarm.
 *
 * `feel` is the same ordering in the other sense the row is read through.
 * Grading a queue is four buttons pressed hundreds of times, mostly without
 * looking down, so each answers with its own weight: crisp and abrupt on
 * Again, softening step by step to barely-there on Easy. Riding the same
 * order the colours do is what makes it learnable rather than merely varied —
 * see `GradeFeel` for why none of them is heavy.
 */
const GRADES: { outcome: StudyOutcome; labelKey: string; feel: GradeFeel }[] = [
  { outcome: 'again', labelKey: 'study.again', feel: 'firm' },
  { outcome: 'hard', labelKey: 'study.hard', feel: 'solid' },
  { outcome: 'good', labelKey: 'study.good', feel: 'light' },
  { outcome: 'easy', labelKey: 'study.easy', feel: 'soft' },
];

export function GradeShelf({
  onGrade,
  disabled,
}: {
  onGrade: (outcome: StudyOutcome) => void;
  disabled?: boolean;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const t = useT();
  const s = useStyles();
  const tint = TINT[themeName === 'night' ? 'night' : 'day'];

  return (
    <View style={s.shelf}>
      {GRADES.map((g) => {
        const tone = toneOf(p, g.outcome);
        return (
          <Touchable
            key={g.outcome}
            onPress={() => onGrade(g.outcome)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t(g.labelKey)}
            accessibilityState={{ disabled: !!disabled }}
            // The grade's own weight replaces Touchable's shared Light tick —
            // two haptics on one press reads as a stutter, and the generic one
            // would drown the distinction these four exist to make. Press-*in*,
            // like the one it replaces, so it lands with the finger.
            haptic={false}
            onPressIn={() => gradeFeedback(g.feel)}
            minTarget={false}
            radius={radius.control}
            style={[
              s.tile,
              { backgroundColor: alpha(tone, tint.fill), borderColor: alpha(tone, tint.border) },
              disabled && s.disabled,
            ]}
          >
            <Text style={[s.label, { color: tone }]} numberOfLines={1}>
              {t(g.labelKey)}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

function toneOf(p: Palette, outcome: StudyOutcome): string {
  switch (outcome) {
    case 'again':
      return p.srsAgain;
    case 'hard':
      return p.srsHard;
    case 'good':
      return p.srsGood;
    case 'easy':
      return p.srsEasy;
  }
}

/** No palette here on purpose: the only coloured thing on a tile is its
 *  grade's hue, and that is applied per tile above. */
function useStyles() {
  return useMemo(
    () =>
      StyleSheet.create({
        shelf: { flexDirection: 'row', gap: spacing.sm + 2 },
        tile: {
          flex: 1,
          height: TILE_H,
          borderRadius: radius.control,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        disabled: { opacity: 0.4 },
        /** 14/600 → 500 by the brief's weight rule, which is below 15px. */
        label: type.labelButton,
      }),
    [],
  );
}
