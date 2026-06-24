'use client';

import { Zap } from 'lucide-react';

type Props = {
  onPress: () => void;
};

// Top-of-Decks-list CTA. Single-tap entry into cross-deck "hardest"
// mode.
export function StudyAllHardestButton({ onPress }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="mb-5 flex w-full items-center gap-3 rounded-lg border border-lgc-border-strong bg-lgc-bg-elev px-4 py-3.5 text-left transition-colors hover:bg-lgc-bg-sunken"
    >
      <Zap size={22} className="text-lgc-fg" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-lgc-fg">
          Study hardest across all decks
        </div>
        <div className="text-xs text-lgc-fg-muted">
          Pulls the hardest cards from every deck
        </div>
      </div>
      <span className="text-2xl text-lgc-fg-muted">›</span>
    </button>
  );
}
