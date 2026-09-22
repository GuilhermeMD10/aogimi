'use client';

// "Added to <deck>" — the white pill with a `good` check that follows a card
// (page 11 → Behaviour; not designed, this is the README's white pill). Mounted
// by the app shell after the modal closes; goes away on its own.

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { PANE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

const SHOW_MS = 2400;

export function AddedToast({ deckName, onDone }: { deckName: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      role="status"
      className={cn(
        PANE,
        'fixed bottom-8 left-1/2 z-50 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full pr-5 pl-4',
        'font-[family-name:var(--face-ui)] text-[13px] leading-none font-bold text-(--ink)',
        'animate-[modal-enter_200ms_ease-out] motion-reduce:animate-none',
      )}
    >
      <Check size={15} strokeWidth={2.4} aria-hidden className="text-(--good)" />
      Added to {deckName}
    </div>
  );
}
