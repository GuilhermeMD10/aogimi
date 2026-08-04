'use client';

import type { RecentUpgrade } from '@/features/study/stats';
import { stageColor } from '@/shared/components';
import type { MasteryMix } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import { MixBar } from './MixBar';
import { UpgradeRows } from './UpgradeRows';

/**
 * The bottom ledger — sky level only, hidden while a deck is focused. One
 * glass card, two sizes: expanded it reads stats · mastery mix · recent
 * upgrades left to right between hairline dividers; collapsed it is a centred
 * pill holding just the mix. Clicking anywhere on the card toggles (the
 * handover's gesture), so the inner upgrade rows stop propagation.
 *
 * SESSIONS is deliberately absent from the stat run: no session entity exists
 * to count, the same reason the old decks page dropped "studied N×".
 */

type Props = {
  expanded: boolean;
  onToggle: () => void;
  /** `null` = still loading; the tile shows a dash. */
  days: number | null;
  stars: number | null;
  dueToday: number | null;
  mastered: number | null;
  mix: MasteryMix | null;
  upgrades: RecentUpgrade[] | null;
  onUpgradeClick: (deckId: string, cardId: string) => void;
};

export function StageLedger({
  expanded,
  onToggle,
  days,
  stars,
  dueToday,
  mastered,
  mix,
  upgrades,
  onUpgradeClick,
}: Props) {
  const shell = {
    background: NIGHT.glass,
    border: `1px solid ${NIGHT.bdB}`,
    boxShadow: NIGHT.panelShadow,
  } as const;

  const toggleKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  if (!expanded) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-expanded={false}
        aria-label="Expand the ledger"
        onClick={onToggle}
        onKeyDown={toggleKeys}
        className="absolute bottom-[84px] left-1/2 z-20 w-[min(560px,calc(100%-56px))] -translate-x-1/2 cursor-pointer rounded-[16px] px-5 py-3.5 backdrop-blur-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={shell}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <MixBar mix={mix} barHeight={8} />
          </div>
          <span
            className="shrink-0 font-[family-name:var(--face-mono)] text-[8px] tracking-[0.18em] whitespace-nowrap"
            style={{ color: NIGHT.faint }}
          >
            ∧ EXPAND
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded
      aria-label="Collapse the ledger"
      onClick={onToggle}
      onKeyDown={toggleKeys}
      className="absolute right-5 bottom-[84px] left-5 z-20 cursor-pointer rounded-[18px] backdrop-blur-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      style={shell}
    >
      <div className="flex items-stretch gap-[22px] px-6 py-4">
        {/* ── the account's figures ── */}
        <div className="flex shrink-0 items-center gap-7">
          <Stat label="DAYS STUDIED" value={days} color={NIGHT.ink} />
          <Stat label="STARS IN YOUR SKY" value={stars} color={NIGHT.ink} />
          <Stat label="DUE TODAY" value={dueToday} color={NIGHT.gold} />
          <Stat label="MASTERED" value={mastered} color={stageColor('mastered')} />
        </div>

        <Divider />

        {/* ── the mastery mix across every deck ── */}
        <div className="flex w-[260px] shrink-0 flex-col justify-center max-[1100px]:hidden">
          <MixBar mix={mix} />
        </div>

        <Divider className="max-[1100px]:hidden" />

        {/* ── the latest promotions, each a jump to its star ── */}
        <div className="min-w-0 flex-1 max-[860px]:hidden">
          <div
            className="mb-1 font-[family-name:var(--face-mono)] text-[8.5px] tracking-[0.16em]"
            style={{ color: NIGHT.faint }}
          >
            RECENT UPGRADES
          </div>
          <UpgradeRows upgrades={upgrades} onPick={onUpgradeClick} />
        </div>

        <span
          className="self-center font-[family-name:var(--face-mono)] text-[8px] tracking-[0.18em] whitespace-nowrap"
          style={{ color: NIGHT.faint }}
        >
          ∨ HIDE
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-[family-name:var(--face-mono)] text-[8.5px] tracking-[0.16em] whitespace-nowrap"
        style={{ color: NIGHT.faint }}
      >
        {label}
      </span>
      {/* Tabular figures so the numbers don't shift width as they land. */}
      <span
        className="font-[family-name:var(--face-mono)] text-[21px] leading-none font-bold whitespace-nowrap tabular-nums"
        style={{ color }}
      >
        {value === null ? '—' : value.toLocaleString()}
      </span>
    </div>
  );
}

function Divider({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`w-px shrink-0 self-stretch ${className}`} style={{ background: NIGHT.bdB }} />;
}
