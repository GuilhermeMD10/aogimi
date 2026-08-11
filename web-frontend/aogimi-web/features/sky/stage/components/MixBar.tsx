'use client';

import { stageColor, stageLabel } from '@/shared/components';
import { MIX_ORDER, type MasteryMix } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';

/**
 * The mastery mix: a stacked bar, one segment per tier sized by count, with the
 * dot legend under it. Sits in the bottom ledger (whole-sky mix) and in the
 * glass column's deck-info section (deck-scoped mix). Tier colours come from
 * `stageColor` — the `--stage-*` ramp the sky's palette mirrors — so the bar
 * and the stars always agree.
 */
export function MixBar({
  mix,
  barHeight = 9,
  nowrap = false,
}: {
  mix: MasteryMix | null;
  barHeight?: number;
  /**
   * Clip the legend instead of wrapping it. The stats-bar variant: that bar is
   * one fixed-height line sharing a row with the deck name, four figures and
   * the delete button, so a second legend line would push the whole bar taller
   * — and the bar's height is what the camera's top inset is cut to. The
   * ledger, which owns its own width, keeps the wrapping default.
   */
  nowrap?: boolean;
}) {
  const total = mix ? MIX_ORDER.reduce((n, s) => n + mix[s], 0) : 0;

  return (
    <div className="min-w-0">
      <div
        className="flex overflow-hidden rounded-[5px]"
        style={{ height: barHeight, background: NIGHT.track }}
      >
        {mix &&
          total > 0 &&
          MIX_ORDER.map(
            (s) =>
              mix[s] > 0 && (
                <span key={s} style={{ flex: mix[s], background: stageColor(s) }} />
              ),
          )}
      </div>
      <div
        className={`mt-2 flex gap-x-3.5 gap-y-1 ${
          nowrap ? 'flex-nowrap overflow-hidden' : 'flex-wrap'
        }`}
      >
        {MIX_ORDER.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 font-[family-name:var(--face-mono)] text-[9.5px] whitespace-nowrap"
            style={{ color: NIGHT.muted }}
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: stageColor(s) }} />
            {stageLabel(s)}{' '}
            <b className="tabular-nums" style={{ color: NIGHT.ink }}>
              {mix ? mix[s].toLocaleString() : '—'}
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
