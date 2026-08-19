'use client';

import {
  GLASS_BUTTON,
  GLASS_GRADE,
  GLASS_GRADE_AGAIN,
  GLASS_GRADE_EASY,
  GLASS_GRADE_GOOD,
  GLASS_GRADE_HARD,
  GLASS_PRESS,
} from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

/**
 * Four tinted glasses, one per FSRS grade — see the grade block in `glass.css`
 * for the tints and why they're local rather than `--danger` / `--warn`.
 *
 * **Why there are four.** FSRS is fitted on a four-grade distribution in which
 * Good is the dominant success grade. With three buttons there is no neutral
 * success: whatever the third button emits gets the treatment of that grade on
 * *every* correct answer. Emitting Easy applied the `w16` bonus each time and
 * drove difficulty to its floor of 1.0, giving 8 → 66 → 397 → 1875 day
 * intervals — arithmetically correct FSRS on the wrong grade, and it reads as
 * broken. Emitting Good under an "Easy" label would have been worse: the label
 * and the logged grade would disagree, poisoning the review log for any future
 * parameter fit. So: four buttons, four grades, no lie.
 *
 * No interval label under the grade. A static table of "this many days" is a
 * promise the scheduler does not make — the real next-due depends on the card's
 * own stability, so printing a number honestly means computing it per card,
 * which is a different feature. The slot carries the keyboard shortcut instead.
 */
const OUTCOMES: { outcome: StudyOutcome; label: string; hint: string; tint: string }[] = [
  { outcome: 'again', label: 'Again', hint: '1', tint: GLASS_GRADE_AGAIN },
  { outcome: 'hard', label: 'Hard', hint: '2', tint: GLASS_GRADE_HARD },
  { outcome: 'good', label: 'Good', hint: '3', tint: GLASS_GRADE_GOOD },
  { outcome: 'easy', label: 'Easy', hint: '4', tint: GLASS_GRADE_EASY },
];

// Four equal-weight buttons: same glass, same neutral ink, same everything but
// hue. None of them is a filled primary: a highlighted button recommends itself
// before the user has graded anything, and the point is an honest
// self-assessment. Good is the grade the model expects most often, so a UI that
// nudged toward Easy would skew the very distribution FSRS is fitted against.
//
// Ink is stated on the button rather than on the label so `currentColor` (which
// is what the hover edge resolves to) is the ink.
export function ResultButtons({ onResult, disabled }: Props) {
  return (
    <div className="mt-5 flex w-full max-w-[860px] gap-3">
      {OUTCOMES.map(({ outcome, label, hint, tint }) => (
        <button
          key={outcome}
          type="button"
          onClick={() => onResult(outcome)}
          disabled={disabled}
          className={cn(
            GLASS_BUTTON,
            GLASS_PRESS,
            GLASS_GRADE,
            tint,
            'flex flex-1 flex-col items-center gap-[3px] rounded-(--radius-input) px-2.5 py-3.5',
            'font-[family-name:var(--face-ui)] text-[15px] leading-none font-bold text-(--ink)',
            'disabled:pointer-events-none disabled:opacity-50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          {label}
          <span className="font-[family-name:var(--face-mono)] text-[10px] font-normal text-(--muted)">
            {hint}
          </span>
        </button>
      ))}
    </div>
  );
}
