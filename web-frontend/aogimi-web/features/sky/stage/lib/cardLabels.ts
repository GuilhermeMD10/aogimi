import type { SkyCardRecord } from '../types';

/**
 * The small strings the sky's chrome prints about a card or a deck, off the
 * lean row the page already holds. Pure; every function is safe on a null or
 * unparseable timestamp and answers `—` rather than `NaN`.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Scheduled = Pick<SkyCardRecord, 'last_reviewed_at' | 'next_due_at'>;

/**
 * Is the card asking to be reviewed right now — never reviewed, or its
 * scheduled time has passed. The same predicate as `study/session/lib/srs.ts`
 * `isDue` and the backend's `DUE` fragment, restated here because that copy is
 * typed on the full `CardRecord` and lives in a sibling sub-feature.
 */
export function isCardDue(card: Pick<SkyCardRecord, 'next_due_at'>, now = Date.now()): boolean {
  if (!card.next_due_at) return true;
  const t = Date.parse(card.next_due_at);
  return !Number.isFinite(t) || t <= now;
}

/** `12h` / `24d`: the card's current scheduled interval, `next_due_at` minus
 *  `last_reviewed_at`. `—` for a never-reviewed card (nothing is scheduled). */
export function intervalLabel(card: Scheduled): string {
  if (!card.last_reviewed_at || !card.next_due_at) return '—';
  const ms = Date.parse(card.next_due_at) - Date.parse(card.last_reviewed_at);
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  return spanLabel(ms);
}

/** `due now`, or `in 3d` / `in 5h` until it is. */
export function nextDueLabel(card: Scheduled, now = Date.now()): string {
  if (isCardDue(card, now)) return 'due now';
  return `in ${spanLabel(Date.parse(card.next_due_at as string) - now)}`;
}

function spanLabel(ms: number): string {
  if (ms < DAY) return `${Math.max(1, Math.round(ms / HOUR))}h`;
  return `${Math.round(ms / DAY)}d`;
}

/** "Mar 2026", or null when the timestamp is missing/unparseable — the
 *  subtitle every deck frame carries out on the whole-sky view. */
export function startedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** "Mar 4" — the Added sort's cell. */
export function addedLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
