'use client';

import { useCallback, useEffect } from 'react';
import { HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { BubbleContent, type BubbleContentProps } from './BubbleContent';

export type ReaderBubbleProps = BubbleContentProps;

/**
 * The bubble shell — a fixed 880×620 panel above the dock, and the veil behind
 * it.
 *
 * Mounted by `AppShell`, so it is **app-global**: it is the reader's lookup when
 * no dictionary surface is docked, and it is the add-card flow on `/dictionary`
 * and `/decks` as well. Nothing here may assume a reader is behind it.
 *
 * `bottom: 82` is not arbitrary — the `Dock` is `fixed bottom-[22px]` and about
 * 58px tall, and it draws at a higher z-index, so anything lower than this would
 * be covered by it.
 */
export default function ReaderBubble(props: ReaderBubbleProps) {
  const { onClose } = props;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The search field's own Esc clears the text and claims the event, so a
      // non-empty query empties first and a second press closes. Without the
      // guard one keypress did both.
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
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
          // A veil, not a dimmer: the panel's own float shadow does the
          // separating, and this only takes the edge off whatever is behind it.
          // Hardcoded rather than tokenised because the theme-aware tints
          // (`--tint-a`/`--tint-b`) invert — white over a dark page *lightens*
          // the background, which is the opposite of what a scrim is for. Black
          // at 6% is imperceptible on the dark canvas and correct on the light
          // one, so one value serves both.
          background: 'rgba(20,16,12,0.06)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      <div
        // Opaque, like `ReaderPanel`: it covers page text, and `--card` is
        // transparent by design on the redesign, so it can't be the fill for a
        // floating panel.
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border bg-(--bg)',
          'rounded-(--radius-panel) shadow-(--card-shadow-float)',
          'animate-[bubble-enter_180ms_ease-out]',
          HAIRLINE,
        )}
        style={{
          width: 880,
          height: 620,
          bottom: 82,
          left: '50%',
          // Kept in `style` because `bubble-enter` animates this same property
          // and has to carry the centring through every keyframe.
          transform: 'translateX(-50%)',
        }}
      >
        <BubbleContent {...props} />
      </div>
    </>
  );
}
