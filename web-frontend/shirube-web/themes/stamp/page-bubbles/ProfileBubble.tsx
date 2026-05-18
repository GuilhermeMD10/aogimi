'use client';

import { useCallback, useEffect, useRef } from 'react';
import ProfilePage from '@/app/profile/page';
import type { ProfileBubbleProps } from '@/components/page-bubbles/ProfileBubble/ProfileBubble';

export default function ProfileBubble({ onClose }: ProfileBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
          border: '2px solid var(--lgc-fg)',
          borderRadius: 0,
          boxShadow: '6px 6px 0 var(--lgc-fg)',
        }}
      >
        <div className="h-full overflow-auto">
          <ProfilePage />
        </div>
      </div>
    </>
  );
}
