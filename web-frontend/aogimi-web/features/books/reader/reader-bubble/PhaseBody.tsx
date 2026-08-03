'use client';

import type { ReactNode } from 'react';

/**
 * The scrolling body of a bubble phase that is a *form* rather than an entry.
 *
 * The bubble is 880px wide, which is right for a dictionary entry and far too
 * wide for a deck list or two textareas — a full-width "Add card" button reads
 * as a banner. So these phases run in a centred column and the extra width stays
 * empty, which is what it's for.
 *
 * The dictionary phases don't use this: the entry panes bring their own padding
 * and their hero's lower edge has to span the whole bubble.
 */
export function PhaseBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[520px] px-6 pt-6 pb-8">{children}</div>
    </div>
  );
}
