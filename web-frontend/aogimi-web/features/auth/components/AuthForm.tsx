'use client';

import { Button } from '@/shared/components';
import { AuthField } from './AuthField';
import { ModeSwitch } from './ModeSwitch';
import { SocialButtons } from './SocialButtons';
import type { AuthMode } from '../types';

/**
 * The interactive half of the auth screen: switcher, heading, fields, CTA,
 * footer switch link.
 *
 * ── Why the layout can't shift ─────────────────────────────────────────────
 * The owner's requirement is that the mode switcher does not move when you
 * switch modes; the content below it may change. The handoff's answer was a
 * `min-height:800px` three-row grid with the CTA pinned to the bottom, which
 * also pinned three specific y-coordinates. That's more machinery than the
 * requirement needs, and its numbers were calibrated with the Google/Apple
 * buttons in the panel — which don't ship (see `SocialButtons`).
 *
 * What's here instead: the panel is vertically centred, and the signup-only
 * EMAIL field is **always mounted**, going `invisible` + `inert` in login mode
 * rather than unmounting. So the field stack occupies the same box in both
 * modes, the panel's height never changes, its centring never recomputes, and
 * the switcher is immobile *by construction* rather than by a pixel guess that
 * a font swap or a wrapped error message could invalidate. `inert` keeps the
 * hidden field out of the tab order and the accessibility tree, and login
 * never reads its value.
 *
 * The visible consequence is a field's worth of blank space in the login
 * state. That's the same trade the handoff made deliberately, for the same
 * reason.
 *
 * ── What the handoff asks for and isn't here ───────────────────────────────
 *  - "Keep me signed in": the refresh cookie is always 30-day persistent and
 *    there is no session-only mode to toggle, so the checkbox would have been
 *    decorative. Omitted by the owner.
 *  - "Forgot password?": no `/reset` route, no reset-token table, no mailer.
 *    Omitted by the owner.
 *  - terms / privacy links: `/terms` and `/privacy` don't exist.
 *  - Google / Apple: built, flagged off — see `SocialButtons`.
 */

// No OAuth exists on the backend. Flip to `true` once it does; the buttons and
// their divider are written and waiting in `SocialButtons`. Annotated as
// `boolean` so the dead branch isn't narrowed to `never` and flagged as
// unreachable — it's intentionally dormant, not wrong.
const SHOW_SOCIAL_AUTH: boolean = false;

const HEADINGS: Record<AuthMode, { title: string; sub: string }> = {
  login: { title: 'Welcome back', sub: 'The sky kept your place.' },
  signup: { title: 'Start looking up', sub: 'An empty sky, and one word to begin with.' },
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
          <p className="mt-[9px] mb-0 font-[family-name:var(--face-ui)] text-[14.5px] text-(--muted)">
            {sub}
          </p>
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
            placeholder="gui"
            value={username}
            onChange={onUsernameChange}
            autoComplete="username"
          />

          {/* Always mounted — see the layout note above. */}
          <div className={isSignup ? undefined : 'invisible'} inert={!isSignup}>
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

          <Button
            type="submit"
            disabled={submitting}
            className="h-[52px] w-full justify-center rounded-(--radius-input) shadow-[0_10px_24px_rgba(33,56,92,.24)]"
          >
            {submitting ? 'One moment…' : isSignup ? 'Create my sky' : 'Log in'}
            {!submitting && <ArrowIcon />}
          </Button>
        </form>

        {SHOW_SOCIAL_AUTH && <SocialButtons />}

        <p className="mt-[26px] mb-0 text-center font-[family-name:var(--face-ui)] text-[13.5px] text-(--muted)">
          {isSignup ? 'Already looking up? ' : 'New here? '}
          <button
            type="button"
            onClick={() => onModeChange(isSignup ? 'login' : 'signup')}
            className="cursor-pointer border-b border-(--paper-bd) font-bold text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}
