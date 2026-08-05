'use client';

import { GLASS_PRESS, PaperCard } from '@/shared/components';
import { SKY_HUES, SKY_PALETTES } from '@/features/sky';
import { useSkyHue } from '@/features/app-shell/providers/SkyHueProvider';
import { cn } from '@/lib/util/cn';
import { SettingRow } from './SettingRow';

/**
 * The sky hue picker — a second axis beside the theme, not a theme. Applies
 * instantly via SkyHueProvider (html[data-sky-hue] + the `aogimi-sky-hue` key),
 * which repaints the star map and every surface built on the four mastery rank
 * colours.
 *
 * Unlike AppearanceCard's hardcoded swatch dots, the dots here come from
 * `SKY_PALETTES[h].ranks` at runtime: the presets *are* those colours, so
 * copying them into this file would be two lists to keep in step.
 */
export function SkyHueCard() {
  const { hue, setHue } = useSkyHue();

  return (
    <PaperCard>
      <SettingRow
        title="Sky hue"
        description="The star map's palette, and with it the four mastery ranks — new, recent, learned, mastered — wherever they show: rank pills, meters, stage dots, ledgers. Separate from the theme; each preset reads in both."
        control={
          <div className="flex flex-wrap justify-end gap-2">
            {SKY_HUES.map((h) => {
              const { label, ranks } = SKY_PALETTES[h];
              const selected = hue === h;
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setHue(h)}
                  className={cn(
                    GLASS_PRESS,
                    'flex items-center gap-[9px] rounded-(--radius-button) border px-3.5 py-2.5 text-[13px] leading-none font-bold',
                    // transform named explicitly — see AppearanceCard.
                    'transition-[color,background-color,border-color,transform] duration-120 ease-[ease]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                    selected
                      ? 'border-(--active) bg-(--active) text-(--active-ink)'
                      : 'border-(--paper-bd) text-(--soft) hover:border-(--btn)',
                  )}
                >
                  {/* New → Mastered, left to right — the same order the ledger
                      and the rank pills read in. */}
                  <span aria-hidden className="flex items-center gap-[3px]">
                    {ranks.map((color, i) => (
                      <span
                        key={i}
                        className="size-[9px] rounded-full"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        }
      />
    </PaperCard>
  );
}
