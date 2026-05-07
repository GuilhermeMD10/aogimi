'use client';

import { useState } from 'react';
import { Check, Lightbulb, X } from 'lucide-react';
import { KAMON_SET, Kamon } from './avatar';

export interface AvatarPickerModalProps {
  current: number;
  onSelect: (idx: number) => void;
  onClose: () => void;
}

export default function AvatarPickerModal({ current, onSelect, onClose }: AvatarPickerModalProps) {
  const [selected, setSelected] = useState(current);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-140 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg-elev shadow-2xl">
        <div className="flex items-center border-b border-lgc-border px-5 py-4">
          <div>
            <div className="lgc-section-label">Choose avatar</div>
            <div className="mt-0.5 text-sm font-medium text-lgc-fg">
              Kamon — traditional family crest monograms
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-3.5 text-[11px] text-lgc-fg-muted">
            16 kamon options — select one to represent your profile.
          </div>
          <div className="grid grid-cols-8 gap-2.5">
            {KAMON_SET.map((k, i) => (
              <div key={k.k} className="flex flex-col items-center gap-1">
                <Kamon char={k.k} size={52} active={selected === i} onClick={() => setSelected(i)} />
                <div
                  className="text-center text-[9px] leading-tight text-lgc-fg-muted font-display"
                >
                  {k.k}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-lgc-bg-sunken px-3 py-2.5 text-xs text-lgc-fg-muted">
            <Lightbulb size={14} className="shrink-0" />
            <span>Custom upload coming when social features ship.</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-lgc-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-lgc-border px-3 py-1.5 text-sm text-lgc-fg transition-colors hover:bg-lgc-bg-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onSelect(selected); onClose(); }}
            className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-1.5 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
          >
            <Check size={13} /> Save
          </button>
        </div>
      </div>
    </>
  );
}
