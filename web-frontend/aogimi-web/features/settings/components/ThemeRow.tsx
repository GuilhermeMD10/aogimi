'use client';

import { GLASS_ACTIVE, GLASS_BUTTON, GLASS_PRESS } from '@/shared/components';
import {
  THEMES,
  THEME_NAMES,
  useTheme,
  type AppTheme,
} from '@/features/app-shell/providers/ThemeProvider';
import { cn } from '@/lib/util/cn';
import { SettingRow } from './SettingRow';

/* The swatch dots are literal colours, not tokens: they depict the themes, so
 * the light dot must stay paper-coloured while the app is in dark mode. */
const SWATCHES: Record<AppTheme, { background: string; border: string }> = {
  light: { background: '#f3f2ef', border: '1px solid #cfcabb' },
  dark: { background: '#0b0b0d', border: '1px solid #3f424a' },
};

/**
 * The theme picker — the one setting that changes every other page. Applies
 * instantly via ThemeProvider (html[data-theme] + the `aogimi-theme` key);
 * until the user picks explicitly, the pre-paint script follows the OS.
 *
 * While `FORCED_THEME` is set in ThemeProvider (`locked`), the control stays on
 * screen and stays wired — it just presents itself as unavailable, so lifting
 * the lock needs no change here.
 *
 * A row rather than a card since settings moved onto /profile: the chips are
 * glass now (`GLASS_BUTTON` + `GLASS_ACTIVE`) instead of paper-edged, which is
 * what lets them sit inside the page's one glass list. `GLASS_BUTTON` owns the
 * border and the transition list, so neither is stated here — and `text-*` is
 * on the unselected branch only, because a utility would beat the ink
 * `GLASS_ACTIVE` brings.
 */
export function ThemeRow() {
  const { theme, setTheme, locked } = useTheme();

  return (
    <SettingRow
      title="Theme"
      description={
        locked
          ? 'Locked to dark while the dark-mode redesign is in progress. Your saved choice is kept.'
          : 'Light for daylight, dark for evenings. Changes the whole app.'
      }
      control={
        <div className={cn('flex gap-2', locked && 'opacity-50')}>
          {THEME_NAMES.map((name) => {
            const selected = theme === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={selected}
                disabled={locked}
                title={locked ? 'Theme switching is temporarily disabled' : undefined}
                onClick={() => setTheme(name)}
                className={cn(
                  GLASS_BUTTON,
                  GLASS_PRESS,
                  'flex items-center gap-[9px] rounded-(--radius-button) px-3.5 py-2.5 text-[13px] leading-none font-bold',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                  locked && 'cursor-not-allowed',
                  selected ? GLASS_ACTIVE : 'text-(--soft)',
                )}
              >
                <span aria-hidden className="size-[13px] rounded-full" style={SWATCHES[name]} />
                {THEMES[name].label}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
