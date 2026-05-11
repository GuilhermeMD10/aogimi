'use client';

import { useCallback, useEffect } from 'react';
import { BubbleContent, type BubbleContentProps } from './BubbleContent';

export type ReaderBubbleProps = BubbleContentProps;

export default function ReaderBubble(props: ReaderBubbleProps) {
  const { onClose } = props;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleScrimClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
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
        className="fixed z-50 flex flex-col overflow-hidden animate-[bubble-enter_180ms_ease-out]"
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
        <BubbleContent {...props} />
      </div>
    </>
  );
}
