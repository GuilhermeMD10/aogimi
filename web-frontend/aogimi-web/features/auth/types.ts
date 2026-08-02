import type { StoredAuthUser } from '@/features/auth/lib/storage';

export type AuthUser = StoredAuthUser;

/** Which half of the auth screen is showing. Local state, not a route — the
 *  app has one `/authenticate` route and `AppShell` gates on that exact
 *  string. */
export type AuthMode = 'login' | 'signup';
