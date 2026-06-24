'use client';

import { useStudyDisplayPrefs } from '../hooks/useStudyDisplayPrefs';
import { PresetPicker } from './PresetPicker';
import type { BackPrefs, FrontPrefs } from '../types';

// User-facing screen for display preferences. Optimistic updates —
// flips immediately, persists to localStorage + backend in the
// background.

const FRONT_TOGGLES: { key: keyof FrontPrefs; label: string }[] = [
  { key: 'reading',  label: 'Show reading' },
  { key: 'context',  label: 'Show context (with cloze)' },
  { key: 'deckName', label: 'Show deck name' },
];

const BACK_TOGGLES: { key: keyof BackPrefs; label: string }[] = [
  { key: 'exampleSentence', label: 'Show example sentence' },
];

export function StudyDisplaySettings() {
  const { prefs, loading, setPreset, toggleFront, toggleBack } = useStudyDisplayPrefs();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-lgc-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
      <h1 className="font-display text-2xl text-lgc-fg">Study display</h1>

      <Section label="Preset">
        <PresetPicker value={prefs.preset} onChange={setPreset} />
      </Section>

      <Section label="Front">
        {FRONT_TOGGLES.map(({ key, label }) => (
          <ToggleRow
            key={key}
            label={label}
            value={prefs.front[key]}
            onToggle={() => toggleFront(key)}
          />
        ))}
      </Section>

      <Section label="Back">
        {BACK_TOGGLES.map(({ key, label }) => (
          <ToggleRow
            key={key}
            label={label}
            value={prefs.back[key]}
            onToggle={() => toggleBack(key)}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-fg-muted">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between border-b border-lgc-border py-3 text-left"
    >
      <span className="text-sm text-lgc-fg">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-lgc-accent' : 'bg-lgc-bg-sunken'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
