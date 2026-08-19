/**
 * "2m" / "14m" / "1h" / "3d" — the age label on a recent-lookup row.
 *
 * Deliberately **not** localized. These are compact metadata beside the row,
 * and the three forms are a digit plus one latin letter; a translated "3日前"
 * would be wider than the gloss it sits next to and would need per-locale
 * width rules in the row. If ages ever need words, they belong in i18n as
 * full phrases, not as these stubs.
 */
export function relativeAge(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  // A malformed timestamp is possible — the store has held rows across schema
  // changes. Empty reads as "no age", which the row simply omits.
  if (!Number.isFinite(then)) return '';

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  // The store caps at ten entries and they turn over quickly, so there is no
  // week/month step — a row that old is rare and "31d" still reads.
  return `${days}d`;
}
