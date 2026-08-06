'use client';

import {
  GLASS_BUTTON,
  GLASS_GRADE,
  GLASS_GRADE_AGAIN,
  GLASS_GRADE_EASY,
  GLASS_GRADE_HARD,
  GLASS_PRESS,
} from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

/** Three tinted glasses, one per grade — see the grade block in `glass.css` for
 *  the tints and why they're local rather than `--danger` / `--warn`.
 *
 *  No interval label under the label: the real scheduler's next-due for a fresh
 *  card lands in hours where the handoff's static table promises days, and a
 *  number printed as a promise has to be the true one. The slot carries the
 *  keyboard shortcut the screen already listens for instead. */
const OUTCOMES: { outcome: StudyOutcome; label: string; hint: string; tint: string }[] = [
  { outcome: 'again', label: 'Again', hint: '1', tint: GLASS_GRADE_AGAIN },
  { outcome: 'hard', label: 'Hard', hint: '2', tint: GLASS_GRADE_HARD },
  { outcome: 'easy', label: 'Easy', hint: '3', tint: GLASS_GRADE_EASY },
];

// Three equal-weight buttons: same glass, same neutral ink, same everything but
// hue. Easy used to be the filled primary, which recommended itself before the
// user had graded anything — the point is an honest self-assessment, so nothing
// here says which one to pick.
//
// Ink is stated on the button rather than on the label so `currentColor` (which
// is what the hover edge resolves to) is the ink, per the handoff.
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
