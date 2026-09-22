'use client';

import type { CSSProperties } from 'react';
import { PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

/**
 * The grade shelf (page 07): four tiles, one per FSRS grade, in the four
 * `--grade-*` tokens (`styles/ds-tokens.css`, D6 — fixed in every theme). Tile
 * geometry is the handoff's: 72 tall, R16, `0 16px 0 20px`, fill at .12 (.18
 * on hover), edge at .4, the label left in the grade colour and the key
 * square right. No interval line under the label (owner ruling 2026-09-21,
 * G17): nothing computes a per-grade projection on web.
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
 * Four equal-weight tiles, deliberately: a filled primary would recommend
 * itself before the user has graded anything, and the point is an honest
 * self-assessment.
 */
const OUTCOMES: { outcome: StudyOutcome; label: string; key: string; tint: string }[] = [
  { outcome: 'again', label: 'Again', key: '1', tint: 'var(--grade-again)' },
  { outcome: 'hard', label: 'Hard', key: '2', tint: 'var(--grade-hard)' },
  { outcome: 'good', label: 'Good', key: '3', tint: 'var(--grade-good)' },
  { outcome: 'easy', label: 'Easy', key: '4', tint: 'var(--grade-easy)' },
];

export function ResultButtons({ onResult, disabled }: Props) {
  return (
    <div className="grid w-full max-w-[760px] grid-cols-4 gap-3 max-sm:grid-cols-2">
      {OUTCOMES.map(({ outcome, label, key, tint }) => (
        <button
          key={outcome}
          type="button"
          onClick={() => onResult(outcome)}
          disabled={disabled}
          className={cn(
            PRESS,
            'flex h-[72px] items-center justify-between rounded-(--radius-tile) border pr-4 pl-5',
            'font-[family-name:var(--face-ui)] text-[15px] leading-none font-bold text-(--tint)',
            'border-[color-mix(in_srgb,var(--tint)_40%,transparent)] bg-[color-mix(in_srgb,var(--tint)_12%,transparent)]',
            'transition-[background-color,transform] duration-120 ease-[ease] hover:bg-[color-mix(in_srgb,var(--tint)_18%,transparent)]',
            'disabled:pointer-events-none disabled:opacity-40',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
          style={{ '--tint': tint } as CSSProperties}
        >
          {label}
          <kbd
            aria-hidden
            className="grid size-7 place-items-center rounded-(--radius-chip) border border-[color-mix(in_srgb,var(--tint)_40%,transparent)] bg-(--pane-strong) font-[family-name:var(--face-mono)] text-[11px] font-bold tabular-nums"
          >
            {key}
          </kbd>
        </button>
      ))}
    </div>
  );
}
