'use client';

import { ACTIVE, PANE, PRESS } from '@/shared/components';
import {
  THEMES,
  THEME_NAMES,
  useTheme,
} from '@/features/app-shell/providers/ThemeProvider';
import { cn } from '@/lib/util/cn';
import { SettingRow } from './SettingRow';

/**
 * The theme picker — the one setting that changes every other page. Applies
 * instantly via ThemeProvider (html[data-theme] + the `aogimi-theme` key).
 *
 * The swatch is not a hardcoded hex: the dot carries `data-theme` itself, so
 * `--canvas` and `--accent` resolve *per swatch* to that theme's values while
 * the page stays on the current one. A fifth theme needs no change here.
 */
export function ThemeRow() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingRow
      title="Theme"
      description="Three daylight palettes and a night sky. Changes the whole app."
      control={
        <div className="flex flex-wrap justify-end gap-2">
          {THEME_NAMES.map((name) => {
            const selected = theme === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(name)}
                className={cn(
                  PANE,
                  PRESS,
                  'flex items-center gap-[9px] rounded-full px-3.5 py-2.5 text-[13px] leading-none font-bold',
                  'transition-[background-color,color,transform] duration-120 ease-[ease]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                  selected ? ACTIVE : 'text-(--ink-2) hover:bg-(--pane-strong)',
                )}
              >
                <span
                  aria-hidden
                  data-theme={name}
                  className="relative size-[14px] overflow-hidden rounded-full border border-(--hairline)"
                  style={{ background: 'var(--canvas)' }}
                >
                  <span className="absolute inset-y-0 right-0 w-1/2 bg-(--accent)" />
                </span>
                {THEMES[name].label}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
