'use client';

import { Button } from '@/shared/components';

/**
 * The study entry point, and the whole study flow in one control: it is the
 * primary **"Continue Studying · N DUE"** pill while anything is due, and only
 * becomes the quiet **"Study ahead"** pill once the queue is empty.
 *
 * That order is the feature, not the styling. Grading a card that isn't due
 * changes nothing — no stability, no rank, no schedule (`session/lib/srs.ts` →
 * `isDue`) — so "Study ahead" leads to a session that cannot earn anything, and
 * offering it while real work is waiting would send people to the one place
 * their effort doesn't count. Hence the accent pill for the due session, the
 * white pill for practice.
 *
 * **The `null` count is its own state**, deliberately not folded into "nothing
 * due". `null` means the counts request is still in flight, and treating it as
 * zero flashed "Study ahead" on arrival — a link that changes destination a
 * beat after paint, at the moment someone is most likely to click it. It waits
 * instead, disabled and unlabelled as to count.
 *
 * One component for both tiers of the field header: the whole sky's session
 * (`/study?due=1`, page 04's `Continue Studying`) and the focused deck's
 * (`/study?deck={id}`, page 05's `Study Deck Due`). The scope is entirely
 * carried by the props.
 */

type Props = {
  /** The due total for this button's scope. `null` while the request is in flight. */
  due: number | null;
  /** Where a real (earning) session lives — `/study?due=1` or `/study?deck={id}`. */
  href: string;
  /** Open the practice overlay. The caller decides which cards it drills. */
  onStudyAhead: () => void;
  /** Page 04's label + `N DUE` pill, or page 05's label + bare count. */
  scope: 'sky' | 'deck';
};

export function StudyButton({ due, href, onStudyAhead, scope }: Props) {
  const label = scope === 'sky' ? 'Continue Studying' : 'Study Deck Due';

  if (due === null) {
    return (
      <Button disabled title="Counting what is due…">
        {label}
      </Button>
    );
  }

  // Due: a real session, so a real navigation.
  if (due > 0) {
    return (
      <Button href={href} kbd={scope === 'sky' ? `${due.toLocaleString()} DUE` : due.toLocaleString()}>
        {label}
      </Button>
    );
  }

  // Nothing due: **a button, not a link.** Practice runs as an overlay on this
  // page, off the cards the stage is already holding — so there is nowhere to
  // navigate to, and navigating would only throw that inventory away and make
  // the next screen re-fetch it.
  return (
    <Button
      variant="white"
      size="sm"
      onClick={onStudyAhead}
      className="shadow-(--field-pill-shadow)"
      title="Nothing is due — practise freely, grades won’t count"
    >
      Study ahead
    </Button>
  );
}
