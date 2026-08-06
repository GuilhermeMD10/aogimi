'use client';

import { stageColor } from '@/shared/components';
import type { MasteryMix } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import { MixBar } from './MixBar';

/**
 * The stage's stat band — sky level only, hidden while a deck is focused. Stats
 * then the mastery mix, between hairline dividers, in one glass strip.
 *
 * **It lives in the top band and has exactly one size.** Both of those are the
 * same decision, and the reason is the deck grid's scarcest axis: a deck's cell
 * is ~500 world units tall before a single star (FRAME_HEAD + FRAME_FOOT +
 * padding), so the outer view is height-starved from about eight decks up — it
 * is the *height* of the free window that sets how big a deck card can be drawn,
 * not the width. Sitting at the bottom of the screen this card cost the sky a
 * 216px inset; moving it up beside the actions gives that back, and dropping the
 * expanded state means it can never take it again.
 *
 * The recent-upgrades section went with the second state. It was the only thing
 * here that needed the extra height, and it was the only consumer of the
 * whole-sky `/api/stats/recent-upgrades` fetch — so the outer tier now makes one
 * request fewer as well.
 *
 * Sized to the 42px action buttons beside it (StageChrome, same `top-5`) so the
 * two read as one band. They share a row, so the mix is what gives way first on
 * a narrow window — see the breakpoint below.
 *
 * SESSIONS is deliberately absent from the stat run: no session entity exists
 * to count, the same reason the old decks page dropped "studied N×".
 */

type Props = {
  /** `null` = still loading; the tile shows a dash. */
  days: number | null;
  stars: number | null;
  dueToday: number | null;
  mastered: number | null;
  mix: MasteryMix | null;
};

export function StageLedger({ days, stars, dueToday, mastered, mix }: Props) {
  return (
    <div
      // h-[42px] matches the action buttons exactly rather than being padded to
      // roughly their size: the stat block's own content is ~37px (8.5px label +
      // 6px gap + 21px figure), so it centres inside that height with room left.
      className=" z-20 flex h-[42px] items-center gap-4 rounded-[13px] px-8 py-8 -backdrop-blur-[16px]"
    >
      <div className="flex shrink-0 items-center gap-6">
        <Stat label="DAYS STUDIED" value={days} color={NIGHT.ink} />
        <Stat label="STARS IN YOUR SKY" value={stars} color={NIGHT.ink} />
        <Stat label="DUE TODAY" value={dueToday} color={NIGHT.gold} />
        <Stat label="MASTERED" value={mastered} color={stageColor('mastered')} />
      </div>

      {/* ── the mastery mix across every deck ── */}
      {/* Dropped before StageChrome's actions would reach it. The stats are the
          band's reason to exist, so the mix is what yields. */}
      <Divider className="max-[1200px]:hidden" />
      <div className="w-[200px] shrink-0 max-[1200px]:hidden">
        <MixBar mix={mix} barHeight={8} />
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
