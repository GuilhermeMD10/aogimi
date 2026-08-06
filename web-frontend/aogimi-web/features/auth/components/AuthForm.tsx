'use client';

import { GLASS_BUTTON, GLASS_PRESS, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { AuthField } from './AuthField';
import { ModeSwitch } from './ModeSwitch';
import { SocialButtons } from './SocialButtons';
import type { AuthMode } from '../types';

const SHOW_SOCIAL_AUTH: boolean = false;

const HEADINGS: Record<AuthMode, { title: string; sub: string }> = {
  login: { title: 'Welcome back', sub: 'Log in to enter.' },
  signup: { title: 'Create your Aogimi account', sub: 'Save both reading progress and sky.' },
};

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h13" />
      <path d="M12.5 6l6 6-6 6" />
    </svg>
  );
}

export function AuthForm({
  mode,
  onModeChange,
  username,
  email,
  password,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  submitting,
  error,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  username: string;
  email: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const isSignup = mode === 'signup';
  const { title, sub } = HEADINGS[mode];

  return (
    <div className="flex min-h-full items-center justify-center bg-(--bg) px-12 py-14">
      <div className="w-full max-w-[420px]">
        <ModeSwitch mode={mode} onChange={onModeChange} />

        {/* Both headings are one line in both states, so this block is the
            same height either way. */}
        <div className="mt-[34px]">
          <h1 className="m-0 font-[family-name:var(--face-ui)] text-[32px] leading-[1.1] font-bold text-(--ink)">
            {title}
          </h1>
          <p className="mt-[9px] mb-0 font-[family-name:var(--face-ui)] text-[14.5px] text-(--muted)">{sub}</p>
        </div>

        <form
          className="mt-7 flex flex-col gap-[18px]"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <AuthField
            label="USERNAME"
            placeholder="username"
            value={username}
            onChange={onUsernameChange}
            autoComplete="username"
          />

          {/* Always mounted — see the layout note above. */}
          <div className={isSignup ? undefined : 'hidden'} inert={!isSignup}>
            <AuthField
              label="EMAIL"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={onEmailChange}
              autoComplete="email"
            />
          </div>

          <AuthField
            label="PASSWORD"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={onPasswordChange}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            reveal
          />

          {/* Reserved height, so an error doesn't shove the CTA down. Two
              lines' worth: the backend's password message is the longest one
              and wraps at this width. */}
          <p
            role="alert"
            className="min-h-[34px] font-[family-name:var(--face-ui)] text-[12.5px] leading-[1.35] text-(--danger)"
          >
            {error}
          </p>

          {/* Glass, not the filled `--btn` `Button` it used to be — the same
              call `/profile` made, and for the same reason: one material on a
              screen wants one button. Written out rather than composed over
              `GLASS_GHOST` because a 52px full-width CTA shares none of that
              constant's geometry or type. The handoff's blue drop shadow goes
              with it: glass ships at depth 0, so a drop shadow on one control
              would be the only one in the app. */}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              GLASS_BUTTON,
              GLASS_PRESS,
              'flex h-[52px] w-full items-center justify-center gap-2 rounded-(--radius-input)',
              'font-[family-name:var(--face-ui)] text-[15px] leading-none font-bold text-(--ink)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
              'disabled:opacity-60',
            )}
          >
            {submitting ? 'One moment…' : isSignup ? 'Create an account' : 'Log in'}
            {!submitting && <ArrowIcon />}
          </button>
        </form>

        {SHOW_SOCIAL_AUTH && <SocialButtons />}

        <p className="mt-[26px] mb-0 text-center font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <button
            type="button"
            onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
            className={cn(
              GLASS_PRESS,
              'cursor-pointer border-b font-bold text-(--ink)',
              HAIRLINE,
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            )}
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}
