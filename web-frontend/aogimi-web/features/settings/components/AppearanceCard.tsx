'use client';

import { PaperCard } from '@/shared/components';
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
 * The theme picker — the one setting that changes every other page. This is
 * the canonical control now that TopBar's pill toggle is gone. Applies
 * instantly via ThemeProvider (html[data-theme] + the `aogimi-theme` key);
 * until the user picks explicitly, the pre-paint script follows the OS.
 */
export function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  return (
    <PaperCard>
      <SettingRow
        title="Theme"
        description="Light for daylight, dark for evenings. Changes the whole app."
        control={
          <div className="flex gap-2">
            {THEME_NAMES.map((name) => {
              const selected = theme === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTheme(name)}
                  className={cn(
                    'flex items-center gap-[9px] rounded-(--radius-button) border px-3.5 py-2.5 text-[13px] leading-none font-bold',
                    'transition-colors duration-120 ease-[ease]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
                    selected
                      ? 'border-(--btn) bg-(--btn) text-(--btn-ink)'
                      : 'border-(--paper-bd) text-(--soft) hover:border-(--btn)',
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
    </PaperCard>
  );
}
