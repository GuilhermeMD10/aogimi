'use client';

import { useMemo } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';

import { GLASS_BUTTON, GLASS_PRESS, GLASS_SURFACE, stageColor } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { masteryMixOf } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import type { DeckWithCards } from '../types';
import { MixBar } from './MixBar';

/**
 * The focused deck's stats bar — a full-width glass row pinned across the top
 * of the stage, above both the card list panel and the sky. Rendered only while
 * a deck is focused, and in **both** panel states, so the way back out of a
 * deck never disappears with the panel.
 *
 * It replaces three things the deck tier used to carry: the breadcrumb (its back
 * button), the glass column's header row (the deck name), and the column's
 * collapsible deck-info drawer (the four figures and the mastery mix). That
 * drawer was the problem this bar exists to solve — it was the card list's own
 * height it borrowed to show numbers you consult once, so the list paid for the
 * stats every time they were open. Up here they cost the list nothing and the
 * sky only a top inset it was already giving the old panel header.
 *
 * **Deck name only, no meta line.** A `{n} cards · {n} due · started {date}`
 * line under the name would be CARDS, DUE TODAY and STARTED — the same three
 * figures standing 200px to its right in the same bar. One rendering of a fact
 * per surface.
 *
 * **One fixed-height line, and that matters beyond looks.** The bar is 80px to
 * its bottom edge (20 offset + 22 padding + the 38px delete button, its tallest
 * cell), and `SkyView` hard-codes the panels below it and the camera's top inset
 * off that number — so a cell that wrapped would push the bar down over sky the
 * camera had already been fitted to. Every cell is therefore either `shrink-0`
 * or ellipsised, and the mastery legend clips (`nowrap`) rather than wrapping.
 * STARTED is the first figure to go on a narrow window — it is the one that
 * never changes, so it is the one worth least per pixel. **Changing the delete
 * button's size or this row's padding means changing those three numbers.**
 *
 * Deleting the deck sits at the far right, the one destructive control on the
 * bar and deliberately the furthest thing from the back button. The confirm
 * step is the page's (`NightConfirm`) and is mandatory — this button is one
 * click away from the mastery legend.
 */

const MONO = 'font-[family-name:var(--face-mono)]';
const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

type Props = {
  deck: DeckWithCards;
  /** This deck's due figure; `null` while the counts request is in flight. */
  dueCount: number | null;
  /** Clear the focus — back out to the whole sky. */
  onBack: () => void;
  /** Opens the page's confirm step; deletion itself happens there. */
  onRequestDeleteDeck: () => void;
};

export function DeckBar({ deck, dueCount, onBack, onRequestDeleteDeck }: Props) {
  const mix = useMemo(() => masteryMixOf(deck.cards), [deck.cards]);
  const started = startedLabel(deck.created_at);

  return (
    <div
      className={cn(
        GLASS_SURFACE,
        'absolute inset-x-5 top-5 z-30 flex items-center gap-5 rounded-[16px] px-4 py-[11px]',
      )}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to the whole sky"
        className={cn(
          GLASS_BUTTON,
          GLASS_PRESS,
          'flex size-[34px] shrink-0 items-center justify-center rounded-full',
          FOCUS_RING,
        )}
        style={{ color: NIGHT.ink }}
      >
        <ChevronLeft size={17} strokeWidth={1.8} />
      </button>

      <h2
        className="m-0 min-w-0 flex-[0_1_auto] truncate font-[family-name:var(--face-jp)] text-[17px] leading-[1.2] font-bold"
        style={{ color: NIGHT.ink }}
      >
        {deck.name}
      </h2>

      <Divider />

      <div className="flex shrink-0 items-center gap-6">
        <Figure label="CARDS" value={deck.cards.length.toLocaleString()} color={NIGHT.ink} />
        <Figure
          label="MASTERED"
          value={mix.mastered.toLocaleString()}
          // The rank ramp, not a chrome constant — the same colour this deck's
          // mastered stars are drawn in, so the figure and the sky agree.
          color={stageColor('mastered')}
        />
        <Figure
          label="DUE TODAY"
          value={dueCount === null ? '—' : dueCount.toLocaleString()}
          color={NIGHT.gold}
        />
        {/* First to go when the row runs out of width: a date that never
            changes is worth the least per pixel, and dropping it keeps the
            mastery legend from being crushed. */}
        <Figure
          label="STARTED"
          value={started ?? '—'}
          color={NIGHT.soft}
          className="max-[1100px]:hidden"
        />
      </div>

      <Divider />

      <div className="min-w-0 flex-1 overflow-hidden">
        <MixBar mix={mix} barHeight={8} nowrap />
      </div>

      <button
        type="button"
        onClick={onRequestDeleteDeck}
        aria-label={`Delete ${deck.name}`}
        // hover fill is NIGHT.dangerBg, spelled as a class so it stays CSS
        className={`flex size-[38px] shrink-0 items-center justify-center rounded-[11px] transition-colors duration-120 ease-[ease] hover:bg-[rgba(224,113,90,.14)] ${FOCUS_RING}`}
        style={{ border: `1px solid ${NIGHT.dangerBd}`, color: NIGHT.danger }}
      >
        <Trash2 size={16} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}

function Figure({
  label,
  value,
  color,
  className = '',
}: {
  label: string;
  value: string;
  color: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span
        className={`${MONO} text-[8.5px] tracking-[0.16em] whitespace-nowrap`}
        style={{ color: NIGHT.faint }}
      >
        {label}
      </span>
      {/* Tabular figures so the numbers don't shift width as they land. */}
      <span
        className={`${MONO} text-[16px] leading-none font-bold whitespace-nowrap tabular-nums`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="w-px shrink-0 self-stretch"
      style={{ background: NIGHT.bdB }}
    />
  );
}

/** "Mar 2026", or null when the timestamp is missing/unparseable. Also the
 *  subtitle every deck frame carries out on the whole-sky view. */
export function startedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
