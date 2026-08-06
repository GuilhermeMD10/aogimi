'use client';
import { memo } from 'react';

type Props = {
  onSeal: () => void;
  canSeal: boolean;
  /** Whether a deck is focused, i.e. whether there is anywhere to go back to. */
  focused: boolean;
  onLeave: () => void;
  /** Close the sky. Mining carries on; the cards simply queue up unseen. */
  hidden: boolean;
  onHiddenChange: (hidden: boolean) => void;
  /** How many cards are waiting to be shown for the first time. */
  waiting: number;
};

const PRIMARY = 'border-2 border-white px-3 py-1 text-white transition-colors hover:bg-white hover:text-black';
const SECONDARY =
  'border-2 border-white/40 px-3 py-1 text-white/70 transition-colors hover:bg-white hover:text-black disabled:opacity-30';

/** Memoised: this bar has no camera-derived prop, and without the memo it re-renders on every
 *  frame of a drag purely because its parent does. The handlers must stay reference-stable for
 *  the memo to hold — Sky.tsx wraps them in useCallback for exactly this reason. */
export const SkyControls = memo(function SkyControls({
  onSeal,
  canSeal,
  focused,
  onLeave,
  hidden,
  onHiddenChange,
  waiting,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button className={SECONDARY} onClick={onLeave} disabled={!focused}>
        ← all decks
      </button>
      <button className={SECONDARY} onClick={onSeal} disabled={!canSeal}>
        End sessions
      </button>
      <button
        className={hidden && waiting ? PRIMARY : SECONDARY}
        onClick={() => onHiddenChange(!hidden)}
        title={hidden ? 'Reopen the sky; anything new arrives popping' : 'Close the sky; mining carries on'}
      >
        {hidden ? `Show sky${waiting ? ` (${waiting} new)` : ''}` : 'Hide sky'}
      </button>
    </div>
  );
});
