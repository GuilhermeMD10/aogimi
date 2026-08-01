/**
 * Compact age for a timestamp — "2m", "14m", "1h", "3d".
 *
 * Deliberately terse and unit-only, because it sits in a narrow right-hand
 * column where "14 minutes ago" would wrap. Anything older than a week reads
 * as a week count rather than a date: the exact day doesn't matter for "how
 * stale is this lookup".
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
