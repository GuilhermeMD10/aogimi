// JLPT level badge — N5 (easiest) → N1 (hardest). Per-level palette warms for
// easier levels and cools for harder ones; stays tonally adjacent to other
// chips next to it (`lgc-chip` shares the same chip primitive).

const JLPT_PALETTE: Record<number, string> = {
  5: '#8FB08A', // green   — N5 (easiest)
  4: '#B5A27C', // sand
  3: '#D9A557', // amber
  2: '#D97757', // orange  (matches accent family)
  1: '#A05C7B', // plum    — N1 (hardest)
};

export function JlptChip({ level }: { level: number }) {
  const color = JLPT_PALETTE[level] ?? 'var(--lgc-fg-muted)';
  return (
    <span
      className="lgc-chip"
      style={{
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        color,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
      title={`JLPT N${level}`}
    >
      N{level}
    </span>
  );
}
