/**
 * Compact age for a timestamp — "now", "14m", "3h", "2d", "5w".
 *
 * Unit-only because every caller puts it in a narrow right-hand column where
 * "14 minutes ago" would wrap, and because the exact day of an old event
 * carries no information worth the space.
 *
 * Hoisted here from `features/home/lib/relativeTime.ts` and
 * `features/dictionary/lib/relativeAge.ts`, which were byte-identical and
 * both carried a note to merge them once a third caller appeared. The deck
 * detail's "recent upgrades" column is that third.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
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
