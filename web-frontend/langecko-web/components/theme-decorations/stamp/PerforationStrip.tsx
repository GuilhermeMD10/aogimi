import * as React from 'react';

type Props = {
  side: 'top' | 'bottom';
  /**
   * Color shown through the perforation holes — should match the page
   * background behind the stamp surface. Defaults to the page bg.
   */
  color?: string;
  className?: string;
};

/**
 * Stamp-theme decoration: a row of perforation holes along one edge.
 * Position the parent `relative` for this absolutely-positioned strip.
 */
export function PerforationStrip({ side, color = 'var(--lgc-bg)', className }: Props) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 9,
        [side]: -5,
        backgroundImage: `radial-gradient(circle at 5px 5px, ${color} 3.5px, transparent 4px)`,
        backgroundSize: '10px 10px',
        pointerEvents: 'none',
      }}
    />
  );
}
