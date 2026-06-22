'use client';

import type { Preset } from '../types';

const PRESETS: Preset[] = ['easy', 'default', 'hard', 'production'];
const LABELS: Record<Preset, string> = {
  easy: 'Easy',
  default: 'Default',
  hard: 'Hard',
  production: 'Production',
};

type Props = {
  value: Preset;
  onChange: (preset: Preset) => void;
};

// Segmented control over the 4 presets. Selecting a preset overwrites
// every toggle to the preset's canonical layout.
export function PresetPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-full border border-lgc-border bg-lgc-bg-sunken p-1">
      {PRESETS.map((p) => {
        const selected = p === value;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`flex-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              selected
                ? 'border-lgc-border-strong bg-lgc-bg-elev font-semibold text-lgc-fg'
                : 'border-transparent text-lgc-fg-muted hover:text-lgc-fg'
            }`}
          >
            {LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
