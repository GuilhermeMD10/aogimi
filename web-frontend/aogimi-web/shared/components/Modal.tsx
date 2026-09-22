'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/util/cn';
import { Button } from './Button';
import { PANE_MODAL } from './glass';

type Props = {
  /** Called on Esc, a scrim click and the close circle. The caller owns
   *  whether the modal is mounted — render it conditionally. */
  onClose: () => void;
  /** Header row: the title at 18/700 on the left, the 40px close circle on
   *  the right. Omit to draw your own header in `children`. */
  title?: ReactNode;
  /** Anything to the left of the close circle (page 11's deck selector). */
  headerEnd?: ReactNode;
  /** Design size 600×560 (pages 10/11). Both shrink to fit a small window;
   *  `'auto'` lets a short dialog (a confirm) size to its content. */
  width?: number;
  height?: number | 'auto';
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
};

/**
 * The app-global modal shell (pages 10/11): a centred `.pane-modal` panel at
 * R28 over the `--scrim` + `blur(8px)`. Esc and a scrim click close it; the
 * panel enters with `modal-enter` (200ms fade + 8px rise, `globals.css`).
 *
 * Portalled to `<body>` so it stacks above whatever mounted it. Focus moves
 * to the panel on open and returns to the opener on close.
 */
export function Modal({
  onClose,
  title,
  headerEnd,
  width = 600,
  height = 560,
  children,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  // `document` only exists on the client; the first render on the server
  // paints nothing, and the portal mounts right after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser global that has no server value
    setHost(document.body);
  }, []);

  useEffect(() => {
    openerRef.current = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [host]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A field inside may claim Esc first (a search field clears its text),
      // in which case the second press closes.
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onScrim = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!host) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 backdrop-blur-[8px] motion-reduce:animate-none animate-[fade-in_200ms_ease-out]"
      style={{ background: 'var(--scrim)' }}
      onClick={onScrim}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          PANE_MODAL,
          'flex max-h-full max-w-full flex-col gap-4 overflow-hidden rounded-(--radius-modal) p-6 text-(--ink) outline-none',
          'motion-reduce:animate-none',
          className,
        )}
        style={{ width, height: height === 'auto' ? undefined : height, animation: 'modal-enter var(--modal-enter) ease-out' }}
      >
        {title !== undefined && (
          <div className="flex shrink-0 items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--face-ui)] text-[18px] leading-none font-bold">{title}</h2>
            <div className="flex items-center gap-2">
              {headerEnd}
              <Button variant="icon" glyph="close" size="sm" onClick={onClose} aria-label="Close" className="size-10 text-(--ink-2)" />
            </div>
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    host,
  );
}
