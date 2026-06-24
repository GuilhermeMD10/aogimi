import * as React from 'react';

type Props = {
  topLabel?: string;
  centerLabel?: string;
  bottomLabel?: string;
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Stamp-theme decoration: a concentric-ring postmark. Two concentric
 * vermillion rings around stacked labels, slightly rotated.
 */
export function Postmark({
  topLabel = 'NIPPON',
  centerLabel = '語境',
  bottomLabel = 'YŪBIN',
  size = 90,
  rotate = -8,
  className,
  style,
}: Props) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        border: '1.5px solid var(--lgc-accent)',
        borderRadius: '50%',
        boxShadow: 'inset 0 0 0 5px var(--lgc-bg), inset 0 0 0 6.5px var(--lgc-accent)',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--lgc-accent)',
        fontFamily: 'var(--lgc-font-display)',
        transform: `rotate(${rotate}deg)`,
        opacity: 0.85,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.11)),
          letterSpacing: '0.2em',
          fontFamily: 'var(--lgc-font-mono)',
        }}
      >
        {topLabel}
      </span>
      <span
        style={{
          fontSize: Math.round(size * 0.2),
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        {centerLabel}
      </span>
      <span
        style={{
          fontSize: Math.max(8, Math.round(size * 0.1)),
          letterSpacing: '0.2em',
          fontFamily: 'var(--lgc-font-mono)',
        }}
      >
        {bottomLabel}
      </span>
    </span>
  );
}
