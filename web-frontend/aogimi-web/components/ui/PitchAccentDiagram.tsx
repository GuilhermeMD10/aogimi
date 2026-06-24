'use client';

import { splitMora, parsePitchPositions, pitchPattern } from '@/lib/util/pitch';

/**
 * Geometric pitch-accent diagram (Yomichan / OJAD style):
 *   - One point per mora, connected by straight line segments.
 *   - High points sit on the top tier, low points on the bottom tier; the
 *     line direction (up / down) visualises the pitch change between mora.
 *   - Odaka pitches add a trailing low ghost point (open circle, dashed
 *     connector) to show the drop falls on the *following* particle.
 *   - Multi-pattern words (e.g. "0,2") stack as rows, each labeled with its
 *     position number on the left.
 *
 * Renders nothing silently when there's no pitch data or the reading can't
 * be split into mora.
 */
export function PitchAccentDiagram({
  reading,
  pitchAccents,
  size = 'md',
}: {
  reading: string;
  pitchAccents: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  const positions = parsePitchPositions(pitchAccents);
  const mora = splitMora(reading);
  if (positions.length === 0 || mora.length === 0) return null;

  const moraGap = size === 'sm' ? 24 : 50;
  const dotR = size === 'sm' ? 3 : 4;
  const highY = dotR + 2;
  const lowY = highY + (size === 'sm' ? 14 : 18);
  const svgHeight = lowY + dotR + 2;
  const moraFontPx = size === 'sm' ? 13 : 16;
  const sidePad = dotR + 2;

  return (
    <div className="inline-flex flex-col gap-1.5">
      {positions.map((pos, i) => {
        const { states, isOdaka } = pitchPattern(mora.length, pos);

        // Real-mora points, plus a trailing ghost point for odaka.
        const points = states.map((s, idx) => ({
          x: sidePad + idx * moraGap,
          y: s === 'H' ? highY : lowY,
          ghost: false,
        }));
        if (isOdaka) {
          points.push({
            x: sidePad + states.length * moraGap,
            y: lowY,
            ghost: true,
          });
        }
        const svgWidth = sidePad * 2 + (points.length - 1) * moraGap;

        return (
          <div
            key={`${pos}-${i}`}
            className="inline-flex items-center gap-2 text-lgc-fg"
            aria-label={`Pitch accent ${pos}`}
          >
            {positions.length > 1 && (
              <span
                className="font-mono text-[10px] text-lgc-fg-subtle"
                style={{ minWidth: 14 }}
              >
                {pos}
              </span>
            )}
            <div className="inline-flex flex-col items-start">
              <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                role="img"
                aria-hidden
              >
                {/* Connecting segments — drawn first so dots overlay them. */}
                {points.slice(0, -1).map((p, idx) => {
                  const next = points[idx + 1]!;
                  const dashed = p.ghost || next.ghost;
                  return (
                    <line
                      key={`l-${idx}`}
                      x1={p.x}
                      y1={p.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeDasharray={dashed ? '3 3' : undefined}
                    />
                  );
                })}
                {/* Points. Filled = real mora, open = ghost (odaka particle). */}
                {points.map((p, idx) => (
                  <circle
                    key={`c-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={dotR}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    fill={p.ghost ? 'transparent' : 'currentColor'}
                  />
                ))}
              </svg>
              {/* Mora text underneath, aligned to each dot's x. */}
              <div
                style={{
                  position: 'relative',
                  width: svgWidth,
                  height: moraFontPx + 4,
                }}
              >
                {mora.map((m, idx) => (
                  <span
                    key={`t-${idx}`}
                    style={{
                      position: 'absolute',
                      left: sidePad + idx * moraGap,
                      transform: 'translateX(-50%)',
                      fontSize: moraFontPx,
                      lineHeight: `${moraFontPx + 2}px`,
                      fontFamily: 'var(--lgc-font-jp, var(--font-shippori-mincho))',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
