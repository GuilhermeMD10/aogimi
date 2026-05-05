import * as React from 'react';

type Props = {
  /** The big stamp value, e.g. "20", "30". */
  value: React.ReactNode;
  /** Smaller line under it — typically a year or unit, e.g. "2017" or "JPY". */
  caption?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Stamp-theme decoration: the postage denomination block, vermillion serif
 * numerals over a small mono caption. Drops in the corner of book/deck
 * cards.
 */
export function Denomination({ value, caption, className, style }: Props) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        fontFamily: 'var(--lgc-font-display)',
        fontWeight: 700,
        fontSize: 22,
        color: 'var(--lgc-accent)',
        lineHeight: 1,
        ...style,
      }}
    >
      <span>{value}</span>
      {caption ? (
        <span
          style={{
            fontFamily: 'var(--lgc-font-mono)',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: 'var(--lgc-fg-subtle)',
            fontWeight: 400,
          }}
        >
          {caption}
        </span>
      ) : null}
    </span>
  );
}
