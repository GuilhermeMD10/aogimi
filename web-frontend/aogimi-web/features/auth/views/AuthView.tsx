'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { AuthForm } from '../components/AuthForm';
import { SkyPanel } from '../components/SkyPanel';
import type { AuthMode } from '../types';

/**
 * `/authenticate` — the split screen: night panel left, form right.
 *
 * `mode` is local state, not a route and not a search param. The app has one
 * auth route and `AppShell` gates on `pathname === '/authenticate'` exactly,
 * so a second route would mean editing the redirect predicate in the
 * highest-blast-radius file in the app for a linkable URL nobody asked for.
 *
 * There is no loading branch and no redirect effect here. `AppShell` already
 * returns `null` while auth is resolving and already replaces to `/` once a
 * user exists, so both would be a second implementation of the same rule —
 * and the old one raced with it.
 */
export default function AuthView() {
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Switching modes keeps what's typed, per the handoff. Only the error goes —
  // it described the other mode's attempt.
  const changeMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
  };

  /**
   * Client-side validation mirrors `backend/src/validation/auth.js`. It has to:
   * the README's "password min 8 characters" is only part of the real policy —
   * the backend also demands one non-letter and caps at 72 characters, and
   * username is 3–32 of `[a-zA-Z0-9_.-]`. Checking less here means a
   * valid-looking form comes back as a server error.
   *
   * Returns the first problem, or null.
   */
  const validate = (): string | null => {
    const name = username.trim();
    if (!name) return 'Enter your username.';

    if (mode === 'signup') {
      if (name.length < 3 || name.length > 32) {
        return 'Username must be between 3 and 32 characters.';
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
        return "Username may contain letters, numbers, '_', '.' and '-' only.";
      }
      if (!email.trim()) return 'Enter your email address.';
      // Deliberately loose, matching the backend's pragmatic check rather than
      // trying to out-parse RFC 5322 in a regex.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Enter a valid email address.';
      }
    }

    if (!password) return 'Enter your password.';
    if (mode === 'signup') {
      if (password.length < 8) return 'Password must be at least 8 characters.';
      if (password.length > 72) return 'Password must be at most 72 characters.';
      if (!/[^A-Za-z\s]/.test(password)) {
        return 'Password must contain at least one number or symbol.';
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await signup(username.trim(), email.trim(), password);
      }
      // On success `AuthProvider` sets the user and `AppShell` navigates away,
      // so this component unmounts. Clearing the fields here would only be a
      // state update on the way out.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid h-full min-h-full grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      <SkyPanel />
      <AuthForm
        mode={mode}
        onModeChange={changeMode}
        username={username}
        email={email}
        password={password}
        onUsernameChange={setUsername}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
