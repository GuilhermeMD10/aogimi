'use client';

import { THEMES, useTheme, type AppTheme } from '@/components/providers/ThemeProvider';

// ── Icon: simple half-sun / half-moon shapes ──────────────────────────────────

function DenimIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      {/* Layered squares suggesting structured slate depth */}
      <rect x="1" y="1" width="12" height="12" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="3" y="3" width="8"  height="8"  rx="1" fill="currentColor" opacity="0.35" />
      <rect x="5" y="5" width="4"  height="4"  rx="0.5" fill="currentColor" />
    </svg>
  );
}

function GrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      {/* Simple sun/grain burst */}
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

const ICONS: Record<AppTheme, () => React.JSX.Element> = {
  denim: DenimIcon,
  grain: GrainIcon,
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
      <div className="flex w-full gap-1 p-1 rounded-lg bg-black/5">
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
      title={`Switch to ${THEMES[theme === 'denim' ? 'grain' : 'denim'].label}`}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-lumina-sidebar-text hover:bg-lumina-sidebar-hover-bg transition-colors"
      data-ui
    >
      <Icon />
      <span>{THEMES[theme].label}</span>
    </button>
  );
}
