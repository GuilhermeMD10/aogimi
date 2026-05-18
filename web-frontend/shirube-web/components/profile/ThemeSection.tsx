'use client';

import { SectionCard } from '@/components/ui/SectionCard';
import { THEMES, type AppTheme } from '@/components/providers/ThemeProvider';

export function ThemeSection({
  active,
  onSelect,
}: {
  active: AppTheme;
  onSelect: (theme: AppTheme) => void;
}) {
  return (
    <SectionCard title="Theme" subtitle="Choose your visual style">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(THEMES) as AppTheme[]).map((key) => {
          const meta = THEMES[key];
          const p = meta.swatch;
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className="overflow-hidden rounded-lg text-left transition-shadow"
              style={{
                border: isActive ? `2px solid ${p.accent}` : `1px solid ${p.border}`,
                boxShadow: isActive
                  ? `0 0 0 3px color-mix(in oklab, ${p.accent} 20%, transparent)`
                  : 'none',
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: p.bg }}>
                <div className="h-3 w-3 rounded-full" style={{ background: p.accent }} />
                <span className="text-[12px] font-medium" style={{ color: p.fg }}>
                  {meta.label}
                </span>
              </div>
              <div className="px-3 py-1.5" style={{ background: p.bgElev, borderTop: `1px solid ${p.border}` }}>
                <span className="text-[10px]" style={{ color: p.fgMuted }}>
                  {meta.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
