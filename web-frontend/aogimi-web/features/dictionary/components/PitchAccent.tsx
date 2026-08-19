'use client';

import { splitMora, parsePitchPositions, pitchPattern } from '@/lib/util/pitch';

/**
 * Geometric pitch-accent diagram (Yomichan / OJAD style): one point per mora,
 * high points on the top tier, low on the bottom, straight segments between
 * them so the drop is visible as a shape rather than a number.
 *
 * Odaka words add a trailing open point on a dashed connector — the drop falls
 * on the *following* particle, not inside the word. Multi-pattern readings
 * ("0,2") stack as labelled rows.
 *
 * This is generated from `readings[].pitchAccents`, so it is data, not artwork:
 * it renders nothing at all when Kanjium has no annotation for the reading,
 * which is a sizeable slice of JMdict.
 *
 * The reader's lookup surfaces render this same component, so the diagram is
 * identical everywhere it appears.
 */
export function PitchAccent({
  reading,
  pitchAccents,
}: {
  reading: string;
  pitchAccents: string | null | undefined;
}) {
  const positions = parsePitchPositions(pitchAccents);
  const mora = splitMora(reading);
  if (positions.length === 0 || mora.length === 0) return null;

  const MORA_GAP = 30;
  const DOT_R = 4;
  const HIGH_Y = DOT_R + 2;
  const LOW_Y = HIGH_Y + 16;
  const SVG_H = LOW_Y + DOT_R + 2;
  const MORA_PX = 14;
  const PAD = DOT_R + 2;

  return (
    <div className="inline-flex flex-col gap-1.5">
      {positions.map((pos, i) => {
        const { states, isOdaka } = pitchPattern(mora.length, pos);

        const points = states.map((s, idx) => ({
          x: PAD + idx * MORA_GAP,
          y: s === 'H' ? HIGH_Y : LOW_Y,
          ghost: false,
        }));
        if (isOdaka) {
          points.push({ x: PAD + states.length * MORA_GAP, y: LOW_Y, ghost: true });
        }
        const svgWidth = PAD * 2 + (points.length - 1) * MORA_GAP;

        return (
          <div
            key={`${pos}-${i}`}
            className="inline-flex items-center gap-2 text-(--soft)"
            aria-label={`Pitch accent ${pos}`}
          >
            {positions.length > 1 && (
              <span className="min-w-3.5 font-[family-name:var(--face-mono)] text-[10px] text-(--faint)">
                {pos}
              </span>
            )}
            <div className="inline-flex flex-col items-start">
              <svg
                width={svgWidth}
                height={SVG_H}
                viewBox={`0 0 ${svgWidth} ${SVG_H}`}
                role="img"
                aria-hidden
              >
                {/* Segments first so the dots sit on top of them. */}
                {points.slice(0, -1).map((p, idx) => {
                  const next = points[idx + 1]!;
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
                      strokeDasharray={p.ghost || next.ghost ? '3 3' : undefined}
                    />
                  );
                })}
                {points.map((p, idx) => (
                  <circle
                    key={`c-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={DOT_R}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    fill={p.ghost ? 'transparent' : 'currentColor'}
                  />
                ))}
              </svg>

              {/* Mora text under each dot, positioned to match its x. */}
              <div className="relative" style={{ width: svgWidth, height: MORA_PX + 4 }}>
                {mora.map((m, idx) => (
                  <span
                    key={`t-${idx}`}
                    className="absolute -translate-x-1/2 font-[family-name:var(--face-jp)] text-(--soft)"
                    style={{
                      left: PAD + idx * MORA_GAP,
                      fontSize: MORA_PX,
                      lineHeight: `${MORA_PX + 2}px`,
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
