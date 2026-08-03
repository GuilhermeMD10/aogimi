'use client';

import { cn } from '@/lib/util/cn';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

/** Danger, warning, and the filled primary — the handoff's three treatments.
 *  No interval label under the label: the real scheduler's next-due for a fresh
 *  card lands in hours where the handoff's static table promises days, and a
 *  number printed as a promise has to be the true one. */
const OUTCOMES: { outcome: StudyOutcome; label: string; hint: string; className: string }[] = [
  {
    outcome: 'again',
    label: 'Again',
    hint: '1',
    className: 'border-(--danger-bd) bg-(--danger-bg) text-(--danger)',
  },
  {
    outcome: 'hard',
    label: 'Hard',
    hint: '2',
    className: 'border-(--warn-bd) bg-(--warn-bg) text-(--warn)',
  },
  {
    outcome: 'easy',
    label: 'Easy',
    hint: '3',
    className: 'border-(--btn) bg-(--btn) text-(--btn-ink) shadow-[0_8px_20px_rgba(33,56,92,.22)]',
  },
];

// Three equal-weight buttons. The colouring is the handoff's and says what each
// grade *is*, not which one to pick — the user still grades honestly. The digit
// under each label is the keyboard shortcut the screen already listens for.
export function ResultButtons({ onResult, disabled }: Props) {
  return (
    <div className="mt-5 flex w-full max-w-[860px] gap-3">
      {OUTCOMES.map(({ outcome, label, hint, className }) => (
        <button
          key={outcome}
          type="button"
          onClick={() => onResult(outcome)}
          disabled={disabled}
          className={cn(
            'flex flex-1 flex-col items-center gap-[3px] rounded-(--radius-input) border px-2.5 py-3.5',
            'font-[family-name:var(--face-ui)] text-[15px] leading-none font-bold',
            'transition-[transform,opacity] duration-120 ease-[ease] hover:-translate-y-px',
            'disabled:pointer-events-none disabled:opacity-50',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            'motion-reduce:transform-none',
            className,
          )}
        >
          {label}
          <span className="font-[family-name:var(--face-mono)] text-[10px] font-normal opacity-70">
            {hint}
          </span>
        </button>
      ))}
    </div>
  );
}
