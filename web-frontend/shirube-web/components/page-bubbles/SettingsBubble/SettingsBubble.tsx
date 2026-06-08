'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SettingsView from '@/components/views/SettingsView/SettingsView';
import CreditsView from '@/components/views/CreditsView/CreditsView';
import HelpView from '@/components/views/HelpView/HelpView';

// Settings bubble. Mirrors ProfileBubble's structure: scrim + centered
// rounded card. Owns its own view state so nested screens (Settings →
// Credits) stay inside the bubble instead of navigating away.

export type SettingsBubbleProps = {
  onClose: () => void;
};

type View = 'settings' | 'credits' | 'help';

export default function SettingsBubble({ onClose }: SettingsBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>('settings');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape behavior matches the visual back/close UX: from a sub-view
      // it pops back to the list; from the list it closes the bubble.
      if (view !== 'settings') setView('settings');
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [view, onClose]);

  const handleScrimClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-[fade-in_180ms_ease-out]"
        onClick={handleScrimClick}
        style={{
          background: 'rgba(20,16,12,0.06)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      <div
        ref={bubbleRef}
        className="fixed z-50 overflow-hidden animate-[bubble-enter_180ms_ease-out]"
        style={{
          width: 880,
          height: 620,
          bottom: 82,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--lgc-bg-elev)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 'var(--radius-3xl)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        }}
      >
        <div className="h-full overflow-auto">
          {view === 'settings' && (
            <SettingsView
              onOpenHelp={() => setView('help')}
              onOpenCredits={() => setView('credits')}
            />
          )}
          {view === 'help' && (
            <HelpView onBack={() => setView('settings')} />
          )}
          {view === 'credits' && (
            <CreditsView onBack={() => setView('settings')} />
          )}
        </div>
      </div>
    </>
  );
}
