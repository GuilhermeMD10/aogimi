import type { Translate } from './i18n/I18nContext';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** `t` is the caller's `useT()` — this is a plain function and can't call it. */
export function formatRelativeTime(isoOrDate: string | Date, t: Translate): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const diff = Date.now() - date.getTime();
  if (diff < MIN) return t('common.justNow');
  if (diff < HOUR) return t('common.minutesAgo', { n: Math.floor(diff / MIN) });
  if (diff < DAY) return t('common.hoursAgo', { n: Math.floor(diff / HOUR) });
  if (diff < WEEK) return t('common.daysAgo', { n: Math.floor(diff / DAY) });
  return date.toLocaleDateString();
}
