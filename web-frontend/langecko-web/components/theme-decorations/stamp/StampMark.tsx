import * as React from 'react';

type Props = {
  children: React.ReactNode;
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Stamp-theme decoration: the masthead stamp mark. Larger than HankoSeal,
 * with a sumi-ink hairline border, hard offset shadow, and a dashed
 * vermillion outline ring outside.
 */
export function StampMark({ children, size = 96, rotate = -6, className, style }: Props) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        background: 'var(--lgc-accent)',
        color: 'var(--lgc-accent-fg)',
        fontFamily: 'var(--lgc-font-display)',
        fontSize: Math.round(size / 3),
        fontWeight: 600,
        transform: `rotate(${rotate}deg)`,
        boxShadow:
          'inset 0 0 0 2px var(--lgc-bg), inset 0 0 0 4px var(--lgc-accent), 3px 3px 0 var(--lgc-fg)',
        position: 'relative',
        border: '1.5px solid var(--lgc-fg)',
        ...style,
      }}
    >
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: -8,
          border: '1px dashed var(--lgc-error)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
    </span>
  );
}
