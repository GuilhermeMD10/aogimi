'use client';

import Link from 'next/link';

import { GLASS_BUTTON, GLASS_PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { NIGHT } from '../lib/nightChrome';

/**
 * The study entry point, and the whole study flow in one control: it is
 * **"Study N due"** while anything is due, and only becomes **"Study ahead"**
 * once the queue is empty.
 *
 * That order is the feature, not the styling. Grading a card that isn't due
 * changes nothing — no stability, no rank, no schedule (`session/lib/srs.ts` →
 * `isDue`) — so "Study ahead" leads to a session that cannot earn anything, and
 * offering it while real work is waiting would send people to the one place
 * their effort doesn't count. Hence gold and prominent for the due session,
 * quiet glass and secondary for practice.
 *
 * **The `null` count is its own state**, deliberately not folded into "nothing
 * due". `null` means the counts request is still in flight, and treating it as
 * zero flashed "Study ahead" on arrival — a link that changes destination a
 * beat after paint, at the moment someone is most likely to click it. It waits
 * instead, disabled and unlabelled as to count.
 *
 * **Two call sites, one component.** `StageActions` renders it inline at the
 * whole-sky tier (every deck's due, `/study?due=1`); the focused deck's card
 * list panel pins a `block` one at its top (that deck's due,
 * `/study?deck={id}`). The three-way reasoning above is the subtle part and is
 * identical at both, so it lives here rather than twice — the scope is entirely
 * carried by the `due` and `href` the caller hands in.
 */

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function PlayGlyph() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4.5l13 7.5-13 7.5z" />
    </svg>
  );
}

type Props = {
  /** The due total for this button's scope. `null` while the request is in flight. */
  due: number | null;
  /** Where a real (earning) session lives — `/study?due=1` or `/study?deck={id}`. */
  href: string;
  /** Open the practice overlay. The caller decides which cards it drills. */
  onStudyAhead: () => void;
  /** Fill the container rather than hug the label — the panel-pinned variant. */
  block?: boolean;
};

export function StudyButton({ due, href, onStudyAhead, block = false }: Props) {
  const loading = due === null;
  const hasDue = !loading && due > 0;

  const shared = cn(
    'inline-flex items-center gap-[9px] rounded-[11px] px-[18px] text-[13.5px] leading-none font-bold whitespace-nowrap',
    block ? 'w-full justify-center py-3' : 'py-[11px]',
    FOCUS_RING,
  );
  // The gold variant isn't glass, so it owns its own transform and can spend it
  // on the hover lift. The quiet variants take `GLASS_PRESS` instead — glass
  // already spends its transform on the press nudge.
  const lift =
    'transition-transform duration-[180ms] ease-[ease] hover:-translate-y-px motion-reduce:transform-none';

  if (loading) {
    return (
      <span
        aria-hidden
        className={cn(shared, GLASS_BUTTON, 'pointer-events-none opacity-60')}
        style={{ color: NIGHT.soft }}
      >
        <PlayGlyph />
        Study
      </span>
    );
  }

  // Due: a real session, so a real navigation.
  if (hasDue) {
    return (
      <Link
        href={href}
        className={cn(shared, lift)}
        style={{ background: NIGHT.btn, color: NIGHT.btnInk, boxShadow: '0 8px 20px rgba(0,0,0,.35)' }}
      >
        <PlayGlyph />
        Study {due.toLocaleString()} due
      </Link>
    );
  }

  // Nothing due: **a button, not a link.** Practice runs as an overlay on this
  // page, off the cards the stage is already holding — so there is nowhere to
  // navigate to, and navigating would only throw that inventory away and make
  // the next screen re-fetch it.
  return (
    <button
      type="button"
      onClick={onStudyAhead}
      className={cn(shared, GLASS_BUTTON, GLASS_PRESS)}
      style={{ color: NIGHT.soft }}
      title="Nothing is due — practise freely, grades won’t count"
    >
      <PlayGlyph />
      Study ahead
    </button>
  );
}
