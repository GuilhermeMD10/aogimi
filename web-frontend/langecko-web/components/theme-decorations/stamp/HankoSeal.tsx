import * as React from 'react';

type Props = {
  children: React.ReactNode;
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Stamp-theme decoration: a hanko-style seal stamp. Vermillion square with
 * inset paper border, 45° hatch overlay, and a slight rotation so it reads
 * as hand-pressed.
 */
export function HankoSeal({ children, size = 56, rotate = -3, className, style }: Props) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: 'var(--lgc-accent)',
        color: 'var(--lgc-accent-fg)',
        fontFamily: 'var(--lgc-font-display)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
        letterSpacing: '0.05em',
        boxShadow: 'inset 0 0 0 2px var(--lgc-bg), inset 0 0 0 3px var(--lgc-accent)',
        transform: `rotate(${rotate}deg)`,
        position: 'relative',
        ...style,
      }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(45deg, transparent 0 6px, rgba(235,226,208,0.08) 6px 8px)',
          pointerEvents: 'none',
        }}
      />
    </span>
  );
}
