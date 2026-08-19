'use client';

import { Undo2 } from 'lucide-react';

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

/**
 * Take back the last grade. Single step — the backend event row stays, since
 * the next review of the same card overwrites the card state anyway.
 *
 * It sits in the session header beside the close control rather than under the
 * grade row, because the header is where this screen's other session-level
 * control already is. Disabled (not hidden) with
 * nothing to undo, so the header's width doesn't shift after the first grade.
 */
export function UndoButton({ onPress, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      title="Undo the last grade (Z)"
      className="inline-flex h-10 items-center gap-2 rounded-(--radius-button) border border-(--bd-a) px-3 font-[family-name:var(--face-mono)] text-[11px] tracking-[0.08em] whitespace-nowrap text-(--muted) transition-colors duration-120 ease-[ease] hover:bg-(--tint-b) hover:text-(--ink) disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
    >
      <Undo2 size={14} strokeWidth={1.8} aria-hidden />
      UNDO
    </button>
  );
}
