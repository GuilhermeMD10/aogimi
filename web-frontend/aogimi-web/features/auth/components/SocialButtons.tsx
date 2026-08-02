'use client';

/**
 * Google / Apple sign-in — BUILT BUT NOT RENDERED.
 *
 * `SHOW_SOCIAL_AUTH` in `AuthForm` is `false`, so nothing here reaches the
 * screen. Kept in the tree because the design calls for it and the backend
 * doesn't support it yet: there is no OAuth anywhere in `backend/src/routes/
 * auth.js`, no provider column on `users`, and no callback route. Two
 * prominent buttons that do nothing are worse than two that aren't drawn, so
 * they stay dark until there's something behind them.
 *
 * To enable: flip the flag, then wire `onStart` to the provider's authorize
 * URL. The buttons are deliberately identical in both modes — the handoff is
 * explicit that the copy does not become "Sign up with".
 */

function GoogleMark() {
  // The only multi-colour icon in the app. Four fixed Google brand hexes —
  // not palette, not themeable, and mandated by Google's branding terms.
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
      />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6A5.9 5.9 0 0 1 12 5.9z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.9-3.6 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.7.7c1.1 0 1.9-1 2.6-2 .5-.8.8-1.5.9-1.8-.1 0-2.8-1.1-2.8-4zM14.6 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z" />
    </svg>
  );
}

const BUTTON = [
  'flex h-12 w-full cursor-pointer items-center justify-center gap-[11px]',
  'rounded-[11px] border border-(--bd) bg-(--paper)',
  'font-[family-name:var(--face-ui)] text-[14px] font-bold text-(--soft)',
  'transition-[border-color,color] duration-120 ease-[ease]',
  'hover:border-(--ink) hover:text-(--ink)',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
].join(' ');

export function SocialButtons({ onStart }: { onStart?: (provider: 'google' | 'apple') => void }) {
  return (
    <>
      <div className="my-[26px] flex items-center gap-3.5">
        <span className="h-px flex-1 bg-(--paper-bd)" />
        <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.18em] text-(--faint)">
          OR
        </span>
        <span className="h-px flex-1 bg-(--paper-bd)" />
      </div>

      <div className="flex flex-col gap-2.5">
        <button type="button" className={BUTTON} onClick={() => onStart?.('google')}>
          <GoogleMark />
          Continue with Google
        </button>
        <button type="button" className={BUTTON} onClick={() => onStart?.('apple')}>
          <AppleMark />
          Continue with Apple
        </button>
      </div>
    </>
  );
}
