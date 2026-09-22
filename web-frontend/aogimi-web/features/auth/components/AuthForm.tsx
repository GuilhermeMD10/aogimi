'use client';

import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { Button, Eyebrow } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { AuthField } from './AuthField';
import { PasswordStrength } from './PasswordStrength';
import { SocialButtons } from './SocialButtons';
import type { AuthMode } from '../types';

const SHOW_SOCIAL_AUTH: boolean = false;

/**
 * Per-mode copy (auth handoff → Form panel). The sign-in sub drops the
 * handoff's `28 cards are due today` clause — a signed-out screen has no due
 * count. The sign-up sub keeps the app's own line: the handoff's `Free while
 * you read your first book. No card needed.` asserts a pricing model the
 * product doesn't have.
 */
const COPY: Record<AuthMode, { eyebrow: string; title: string; jp: string; sub: string; cta: string }> = {
  login: {
    eyebrow: 'Welcome back',
    title: 'Sign in',
    jp: 'おかえりなさい',
    sub: 'Your sky is where you left it.',
    cta: 'Sign in',
  },
  signup: {
    eyebrow: 'Start your sky',
    title: 'Create account',
    jp: 'はじめまして',
    sub: 'Save your reading progress and your sky.',
    cta: 'Create account',
  },
};

const UI = 'font-[family-name:var(--face-ui)]';
const ICON = { size: 16, strokeWidth: 2, 'aria-hidden': true } as const;

/**
 * The auth card's right panel: eyebrow → title row → sub → fields → the error
 * plate's slot → primary CTA → (social, dark) → the line that flips the mode.
 *
 * Both modes are one form with one field added (Email) and one meter under
 * the password. The Email field stays mounted and `inert` on sign in so what
 * was typed survives a flip; on sign in the username and email would share a
 * row for nothing, so the 2-col grid is sign-up only.
 *
 * The handoff also draws `Forgot password?`, `Keep me signed in on this
 * device`, the five JLPT `Starting level` chips and the Terms / Privacy
 * checkbox. None is built: there is no password reset, no session-only mode,
 * nothing in the sign-up payload for a level, and no Terms or Privacy page
 * (AGENTS.md → Auth). A drawn control is a promise.
 */
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
  const { eyebrow, title, jp, sub, cta } = COPY[mode];

  return (
    <div className={cn('flex flex-col px-6 py-8 text-(--ink)', isSignup ? 'lg:px-14 lg:pt-11 lg:pb-10' : 'lg:px-14 lg:py-12')}>
      <Eyebrow tone="accent" dot className="tracking-[0.16em]">
        {eyebrow}
      </Eyebrow>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-3.5">
        <h1 className={cn(UI, 'm-0 text-[38px] leading-[1.1] font-bold tracking-[-0.02em]')}>{title}</h1>
        <span className="font-[family-name:var(--face-jp)] text-[20px] font-medium text-(--ink-2)">{jp}</span>
      </div>
      <p className={cn(UI, 'mt-2 mb-0 text-[15px] text-(--ink-2)')}>{sub}</p>

      <form
        className="mt-7 flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className={cn('grid gap-3.5', isSignup && 'lg:grid-cols-2')}>
          <AuthField
            label="Username"
            placeholder="username"
            value={username}
            onChange={onUsernameChange}
            autoComplete="username"
            icon={<User {...ICON} />}
          />
          {/* Always mounted — see above. */}
          <div className={isSignup ? 'contents' : 'hidden'} inert={!isSignup}>
            <AuthField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={onEmailChange}
              autoComplete="email"
              icon={<Mail {...ICON} />}
            />
          </div>
        </div>

        <div className={isSignup ? 'mt-4' : 'mt-[18px]'}>
          <AuthField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={onPasswordChange}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            icon={<Lock {...ICON} />}
            reveal
          >
            {isSignup && <PasswordStrength password={password} />}
          </AuthField>
        </div>

        {/* The form-level error plate (auth handoff → Errors). Its slot is
            reserved so an error never shoves the CTA down; the plate fills
            it. `validate()` returns one problem at a time, so there are no
            per-field messages to draw. */}
        <div className="mt-[18px] min-h-[46px]">
          {error && (
            <p
              role="alert"
              className={cn(
                UI,
                'm-0 rounded-(--radius-row) border border-[rgb(var(--danger-rgb)/0.35)] bg-[rgb(var(--danger-rgb)/0.12)] px-3.5 py-3',
                'text-[13px] leading-[1.4] font-medium text-(--danger)',
              )}
            >
              {error}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
          {submitting ? 'One moment…' : cta}
          {!submitting && <ArrowRight size={16} strokeWidth={2.2} aria-hidden />}
        </Button>
      </form>

      {SHOW_SOCIAL_AUTH && !isSignup && <SocialButtons />}

      <p className={cn(UI, 'mt-auto mb-0 pt-7 text-[14px] text-(--ink-2)')}>
        {isSignup ? 'Already reading? ' : 'New to Aogimi? '}
        <button
          type="button"
          onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
          className={cn(
            'cursor-pointer rounded-sm font-bold text-(--accent) transition-colors duration-120 hover:text-(--accent-hover)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          {isSignup ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </div>
  );
}
