// Token storage for the web client.
//
// localStorage for both access + refresh is the pragmatic choice for a
// private beta. The XSS attack surface is small (Next.js + React +
// Tailwind, no untrusted user-supplied HTML rendering anywhere), and
// the alternative — httpOnly cookies — requires server-side cookie
// handling that we don't have yet. helmet's CSP defaults add a baseline
// XSS deterrent.
//
// If/when we add user-generated HTML (rich-text notes, deck descriptions
// rendered raw, etc.), the upgrade path is: backend issues a set-cookie
// on /auth/login carrying the refresh token (httpOnly + secure +
// sameSite=lax), access tokens stay in memory only, and this module
// becomes a thin "is there a session?" probe.

const ACCESS_KEY = 'shirube_access_token';
const REFRESH_KEY = 'shirube_refresh_token';

let memAccess: string | null = null;

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadTokens(): { access: string | null; refresh: string | null } {
  if (!hasStorage()) return { access: null, refresh: null };
  const access = window.localStorage.getItem(ACCESS_KEY);
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  memAccess = access;
  return { access, refresh };
}

export function getAccessToken(): string | null {
  if (memAccess) return memAccess;
  if (!hasStorage()) return null;
  memAccess = window.localStorage.getItem(ACCESS_KEY);
  return memAccess;
}

export function getRefreshToken(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: { access: string; refresh: string }): void {
  memAccess = tokens.access;
  if (!hasStorage()) return;
  window.localStorage.setItem(ACCESS_KEY, tokens.access);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens(): void {
  memAccess = null;
  if (!hasStorage()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
