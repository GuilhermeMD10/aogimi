'use client';

import { Undo2 } from 'lucide-react';

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

// Subtle link below the action row. Single-step only; the backend
// event row stays since the next review on the same card overwrites
// the backend card state.
export function UndoButton({ onPress, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="mx-auto mt-3 flex items-center gap-1.5 px-3 py-1 text-xs text-lgc-fg-muted transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
      style={{ opacity: 0.75 }}
    >
      <Undo2 size={12} /> Undo
    </button>
  );
}
