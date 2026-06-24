'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

type Mode = 'login' | 'signup';

// ── Brand panel (right side) ─────────────────────────────────────────────────

function BrandPanel({ mode }: { mode: Mode }) {
  const tagline = 'read · learn · remember';
  const crestChar = '読';

  return (
    <div
      className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-white/90 lg:flex"
      style={{
        background: 'linear-gradient(160deg, #1A1918 0%, #2A2724 60%, #3A342C 100%)',
        minWidth: 420,
      }}
    >
      {/* Decorative: concentric arcs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.12,
          background: `
            radial-gradient(circle at 80% 90%, rgba(255,255,255,0.7) 0%, transparent 18%),
            radial-gradient(circle at 80% 90%, rgba(255,255,255,0.5) 0 22%, transparent 23%),
            radial-gradient(circle at 80% 90%, rgba(255,255,255,0.3) 0 34%, transparent 35%),
            radial-gradient(circle at 80% 90%, rgba(255,255,255,0.2) 0 46%, transparent 47%)
          `,
        }}
      />
      {/* Subtle stripe texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(91deg, transparent 0 2px, rgba(255,255,255,0.02) 2px 3px)',
        }}
      />

      {/* Top: logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div
          className="flex h-9.5 w-9.5 items-center justify-center rounded-lg border border-white/20 bg-white/12 font-display"
          style={{ fontSize: 20 }}
        >
          {crestChar}
        </div>
        <div
          className="text-[22px] font-normal tracking-tight font-display"
        >
          Aogimi
        </div>
      </div>

      {/* Center: kamon / crest */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div
          className="relative mb-6 flex h-45 w-45 items-center justify-center rounded-full border border-white/25"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          }}
        >
          <div
            className="text-white/92 font-display"
            style={{ fontSize: 110,
              lineHeight: 1, }}
          >
            {crestChar}
          </div>
          {/* Inner ring */}
          <div className="absolute inset-3.5 rounded-full border border-dashed border-white/12" />
        </div>
        <div
          className="mb-1.5 opacity-95 font-display"
          style={{ fontSize: 22,
            letterSpacing: '0.06em', }}
        >
          {tagline}
        </div>
        <div className="max-w-85 text-[13px] leading-relaxed opacity-55">
          Read real Japanese literature with the dictionary, flashcards, and
          context built right in.
        </div>
      </div>

      {/* Bottom: footer */}
      <div
        className="relative z-10 flex justify-between text-[11px] opacity-55 font-mono"
      >
        <span>&copy; 2026 Aogimi</span>
        <span>
          {mode === 'login' ? 'welcome back' : 'joining the library'}
        </span>
      </div>
    </div>
  );
}

// ── Auth field ───────────────────────────────────────────────────────────────

function AuthField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoComplete,
  icon,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  icon: React.ReactNode;
}) {
  return (
    <label className="block">
      <div
        className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-lgc-fg-muted"
      >
        {label}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-lgc-border-strong bg-lgc-bg-elev px-3 py-2.5">
        <span className="text-lgc-fg-subtle">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="flex-1 border-none bg-transparent text-sm text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
        />
      </div>
    </label>
  );
}

// ── Icons (inline, small) ────────────────────────────────────────────────────

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AuthenticatePage() {
  const { user, loading, login, signup } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect to home when logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Clear error when switching modes
  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await signup(username.trim(), password);
      }
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDummyOAuth = () => {
    // No-op: dummy social auth buttons for v1
  };

  if (loading || user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--lgc-bg)' }}>
      {/* Left: form */}
      <div className="flex w-full max-w-110 flex-col overflow-auto px-11 py-12 lg:w-110">
        {/* Logo */}
        <div className="mb-auto flex items-center gap-2 pb-10">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-lgc-accent text-[14px] font-semibold text-lgc-accent-fg font-display"
          >
            読
          </div>
          <span
            className="text-[15px] font-medium font-display"
          >
            Aogimi
          </span>
        </div>

        {/* Heading */}
        <div className="mb-7">
          <div className="lgc-section-label mb-2">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </div>
          <h1
            className="mb-1.5 text-[30px] font-medium tracking-tight font-display"
            style={{ letterSpacing: '-0.015em' }}
          >
            {mode === 'login' ? 'Welcome back' : 'Join Aogimi'}
          </h1>
          <div className="text-[13px] text-lgc-fg-muted">
            {mode === 'login'
              ? 'Continue where you left off reading.'
              : 'Start reading Japanese literature in minutes.'}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <AuthField
            label="Username"
            placeholder="your username"
            value={username}
            onChange={setUsername}
            autoComplete="username"
            icon={<UserIcon />}
          />
          <AuthField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            icon={<LockIcon />}
          />

          {error && (
            <p className="text-sm text-lgc-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-lgc-accent px-4 py-3 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
            {!submitting && <ArrowRightIcon />}
          </button>
        </form>

        {/* Divider */}
        <div className="my-3.5 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-lgc-border" />
          <span className="text-[11px] text-lgc-fg-muted">or continue with</span>
          <div className="h-px flex-1 bg-lgc-border" />
        </div>

        {/* OAuth buttons (dummy) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleDummyOAuth}
            className="flex items-center justify-center gap-2 rounded-lg border border-lgc-border-strong px-3 py-2.5 text-[13px] font-medium text-lgc-fg transition hover:bg-lgc-bg-sunken"
          >
            <GlobeIcon /> Google
          </button>
          <button
            type="button"
            onClick={handleDummyOAuth}
            className="flex items-center justify-center gap-2 rounded-lg border border-lgc-border-strong px-3 py-2.5 text-[13px] font-medium text-lgc-fg transition hover:bg-lgc-bg-sunken"
          >
             Apple
          </button>
        </div>

        {/* Toggle mode */}
        <div className="mt-auto pt-7 text-center text-[13px] text-lgc-fg-muted">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-lgc-accent hover:underline"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-medium text-lgc-accent hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: brand panel */}
      <BrandPanel mode={mode} />
    </div>
  );
}
