'use client';

import { useCallback, useEffect, useRef } from 'react';
import ProfilePage from '@/app/profile/page';
import { useTheme } from '@/components/providers/ThemeProvider';

type Props = {
  onClose: () => void;
};

export default function ProfileBubble({ onClose }: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isStamp = theme === 'stamp';

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on click outside bubble (on the scrim)
  const handleScrimClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 animate-[fade-in_180ms_ease-out]"
        onClick={handleScrimClick}
        style={{
          background: 'rgba(20,16,12,0.06)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Bubble */}
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
          border: isStamp ? '2px solid var(--lgc-fg)' : '1px solid var(--lgc-border)',
          borderRadius: isStamp ? 0 : 20,
          boxShadow: isStamp ? '6px 6px 0 var(--lgc-fg)' : '0 32px 80px rgba(0,0,0,0.22)',
        }}
      >
        <div className="h-full overflow-auto">
          <ProfilePage />
        </div>
      </div>
    </>
  );
}
