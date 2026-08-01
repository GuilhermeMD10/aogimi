/**
 * Compact age for a timestamp — "now", "14m", "3h", "2d", "5w".
 *
 * Unit-only because it sits in a narrow right-hand column where "14 minutes
 * ago" would wrap, and because the exact day of an old lookup carries no
 * information worth the space.
 *
 * `features/home/lib/relativeTime.ts` is the same function for home's
 * dictionary card. Two copies is one too many — they belong in `lib/util/`
 * together — but hoisting home's is a change to a finished screen, so this
 * waits until something needs a third.
 */
export function relativeAge(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';

  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return `${Math.floor(days / 7)}w`;
}
