'use client';

import { ACTIVE, Brand, PANE_NAV, PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { AuthMode } from '../types';

/**
 * The signed-out screen's bar (auth handoff → Top bar): the nav's 64px
 * `.pane-nav` pill with the brand on the left and, on the right, the 44px
 * shell holding one item — the link to the other mode. `TopNav` is not reused
 * because everything else in it (sections, search, avatar) needs a session.
 *
 * The handoff also draws a `Help` row here; `/help` is behind the sign-in
 * gate, so it isn't. The mode item is a button, not a link: the mode is local
 * state (see `AuthView`), not a route.
 */
export function AuthTopBar({ mode, onModeChange }: { mode: AuthMode; onModeChange: (mode: AuthMode) => void }) {
  const isSignup = mode === 'signup';

  return (
    <header className={cn(PANE_NAV, 'flex h-16 items-center justify-between gap-4 rounded-full pr-2.5 pl-[22px]')}>
      <Brand />

      <div className="flex h-11 items-center rounded-full border border-(--hairline) bg-(--pane) px-[5px]">
        <button
          type="button"
          onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
          className={cn(
            PRESS,
            ACTIVE,
            'flex h-[34px] items-center rounded-full px-4 font-[family-name:var(--face-ui)] text-[13px] leading-none font-bold whitespace-nowrap',
            'transition-[filter,transform] duration-120 ease-[ease] hover:brightness-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          {isSignup ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </header>
  );
}
