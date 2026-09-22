'use client';

import { PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

/**
 * Four tinted tiles, one per FSRS grade, in the four `--grade-*` tokens
 * (`styles/ds-tokens.css`, D6 — fixed in every theme). Tile geometry is the
 * handoff's: bg at .12, border at .4, label in the grade colour.
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
 * No interval label under the grade (owner ruling 2026-09-21, G17): nothing
 * computes a per-grade projection on web. The slot carries the key instead.
 */
const OUTCOMES: { outcome: StudyOutcome; label: string; hint: string; tint: string }[] = [
  { outcome: 'again', label: 'Again', hint: '1', tint: 'var(--grade-again)' },
  { outcome: 'hard', label: 'Hard', hint: '2', tint: 'var(--grade-hard)' },
  { outcome: 'good', label: 'Good', hint: '3', tint: 'var(--grade-good)' },
  { outcome: 'easy', label: 'Easy', hint: '4', tint: 'var(--grade-easy)' },
];

// Four equal-weight tiles: same shape, same everything but hue. None of them is
// a filled primary: a highlighted button recommends itself before the user has
// graded anything, and the point is an honest self-assessment.
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
            PRESS,
            'flex h-[72px] flex-1 flex-col items-center justify-center gap-[6px] rounded-(--radius-tile) border px-2.5',
            'font-[family-name:var(--face-ui)] text-[15px] leading-none font-bold',
            'transition-[background-color,transform] duration-120 ease-[ease]',
            'disabled:pointer-events-none disabled:opacity-50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
          style={{
            color: tint,
            background: `color-mix(in srgb, ${tint} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${tint} 40%, transparent)`,
          }}
        >
          {label}
          <span
            className="flex size-5 items-center justify-center rounded-(--radius-chip) font-[family-name:var(--face-mono)] text-[10px] font-medium tabular-nums"
            style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)` }}
          >
            {hint}
          </span>
        </button>
      ))}
    </div>
  );
}
