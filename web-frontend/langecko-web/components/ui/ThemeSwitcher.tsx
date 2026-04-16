'use client';

import { THEMES, useTheme, type AppTheme } from '@/components/providers/ThemeProvider';

// ── Icon: sun (light) / moon (dark) ─────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="3" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="7" y1="7"
          x2={7 + Math.cos((deg * Math.PI) / 180) * 5.5}
          y2={7 + Math.sin((deg * Math.PI) / 180) * 5.5}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M10.5 7.5a5 5 0 0 1-4-6.5 5.5 5.5 0 1 0 4 6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

const ICONS: Record<AppTheme, () => React.JSX.Element> = {
  light: SunIcon,
  dark:  MoonIcon,
};

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  /** 'compact' shows just icon + label, 'full' shows both theme options side by side */
  variant?: 'compact' | 'full';
};

export function ThemeSwitcher({ variant = 'compact' }: Props) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const Icon = ICONS[theme];

  if (variant === 'full') {
    return (
      <div className="flex w-full gap-1 p-1 rounded-lg bg-lumina-primary-text/5">
        {(Object.keys(THEMES) as AppTheme[]).map((t) => {
          const TIcon = ICONS[t];
          const active = t === theme;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              title={THEMES[t].description}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-lumina-primary-teal text-lumina-primary-text shadow-sm'
                  : 'text-lumina-sidebar-text hover:bg-lumina-sidebar-hover-bg'
              }`}
              aria-pressed={active}
            >
              <TIcon />
              <span className="truncate">{THEMES[t].label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact: single toggle button that cycles
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={`Switch to ${THEMES[theme === 'light' ? 'dark' : 'light'].label}`}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-lumina-sidebar-text hover:bg-lumina-sidebar-hover-bg transition-colors"
      data-ui
    >
      <Icon />
      <span>{THEMES[theme].label}</span>
    </button>
  );
}
