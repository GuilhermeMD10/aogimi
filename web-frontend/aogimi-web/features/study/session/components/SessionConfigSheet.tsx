'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import type { StudyMode } from '../types';

// Per-deck session config — mirror of mobile SessionConfigSheet.
// `hardest_all_decks` is excluded (cross-deck entry point, not a
// deck-scoped setting).
const PER_DECK_MODES: StudyMode[] = [
  'hardest',
  'random',
  'oldest_first',
  'oldest_only',
  'newest_only',
  'by_creation',
];

const MODE_LABELS: Record<StudyMode, string> = {
  hardest:           'Hardest → New',
  random:            'Full random',
  oldest_first:      'Oldest first',
  oldest_only:       'Oldest only',
  newest_only:       'New only',
  by_creation:       'By creation date',
  hardest_all_decks: 'Hardest across all decks',
};

const MIN_SIZE = 1;
const MAX_SIZE = 200;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode: StudyMode;
  initialSize: number;
  onSave: (mode: StudyMode, size: number) => void;
};

export function SessionConfigSheet({
  open,
  onOpenChange,
  initialMode,
  initialSize,
  onSave,
}: Props) {
  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [sizeText, setSizeText] = useState(String(initialSize));

  useEffect(() => {
    if (open) {
      // Sheet open is an external trigger — resetting the form state
      // here is the "sync from external" pattern the lint rule warns
      // about by default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(initialMode);
      setSizeText(String(initialSize));
    }
  }, [open, initialMode, initialSize]);

  function handleSave() {
    const parsed = parseInt(sizeText, 10);
    const safe =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed))
        : initialSize;
    onSave(mode, safe);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader>
          <SheetTitle>Session settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-4">
          <Section label="Mode">
            <div className="space-y-1.5">
              {PER_DECK_MODES.map((m) => (
                <ModeRow
                  key={m}
                  label={MODE_LABELS[m]}
                  selected={mode === m}
                  onClick={() => setMode(m)}
                />
              ))}
            </div>
          </Section>

          <Section label="Cards per session">
            <input
              type="number"
              min={MIN_SIZE}
              max={MAX_SIZE}
              value={sizeText}
              onChange={(e) => setSizeText(e.target.value)}
              className="w-24 rounded-md border border-lgc-border bg-lgc-bg-sunken px-3 py-2 text-center text-sm text-lgc-fg"
            />
            <div className="mt-1.5 text-xs text-lgc-fg-subtle">
              Between {MIN_SIZE} and {MAX_SIZE}
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-2 border-t border-lgc-border p-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-lgc-border px-4 py-2 text-sm font-medium text-lgc-fg hover:bg-lgc-bg-elev"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-lgc-accent px-4 py-2 text-sm font-semibold text-lgc-accent-fg hover:opacity-90"
          >
            Save
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-fg-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

function ModeRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
        selected
          ? 'border-lgc-border-strong bg-lgc-bg-elev text-lgc-fg'
          : 'border-lgc-border text-lgc-fg hover:bg-lgc-bg-elev'
      }`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
          selected ? 'border-lgc-fg' : 'border-lgc-border'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-lgc-fg" />}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
