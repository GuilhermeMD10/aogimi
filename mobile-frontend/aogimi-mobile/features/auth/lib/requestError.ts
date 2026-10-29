import type { Translate } from '@/lib/i18n/I18nContext';

/**
 * The HTTP status `request` (`lib/api.ts`) stamps on every answer the server
 * gave, or `undefined` when there was no answer at all — offline, or the 8s
 * deadline — in which case the request was never judged.
 */
export function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * The generic body of a failure alert: "couldn't reach the server" when there
 * was no answer, "something went wrong" when the server answered and refused.
 * Screens with statuses worth naming (sign-in's 401 and 429) map those first.
 */
export function failureReason(err: unknown, t: Translate): string {
  return t(errorStatus(err) === undefined ? 'auth.onboarding.errorOffline' : 'common.error');
}
