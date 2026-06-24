import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';
import { splitMora, parsePitchPositions, pitchPattern } from '@/lib/pitch';

/**
 * Geometric pitch-accent diagram (Yomichan / OJAD style) for React Native.
 * One point per mora connected by line segments; high vs low position
 * mirrors the pitch state. Odaka adds a trailing dashed ghost point.
 *
 * Renders null silently when no pitch data or reading can't be split.
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
  const c = useColors();
  const positions = parsePitchPositions(pitchAccents);
  const mora = splitMora(reading);
  if (positions.length === 0 || mora.length === 0) return null;

  const moraGap = size === 'sm' ? 24 : 50;
  const dotR = size === 'sm' ? 3.5 : 5;
  const strokeW = size === 'sm' ? 1.5 : 1.75;
  const highY = dotR + 3;
  const lowY = highY + (size === 'sm' ? 16 : 22);
  const svgHeight = lowY + dotR + 3;
  const moraFontPx = size === 'sm' ? 13 : 17;
  const sidePad = dotR + 3;

  return (
    <View style={styles.col}>
      {positions.map((pos, i) => {
        const { states, isOdaka } = pitchPattern(mora.length, pos);

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
          <View key={`${pos}-${i}`} style={styles.row}>
            {positions.length > 1 && (
              <Text style={[styles.posLabel, { color: c.fgSubtle, fontFamily: fontFamily.ui }]}>{pos}</Text>
            )}
            <View>
              <Svg width={svgWidth} height={svgHeight}>
                {points.slice(0, -1).map((p, idx) => {
                  const next = points[idx + 1]!;
                  const dashed = p.ghost || next.ghost;
                  return (
                    <Line
                      key={`l-${idx}`}
                      x1={p.x}
                      y1={p.y}
                      x2={next.x}
                      y2={next.y}
                      stroke={c.fg}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeDasharray={dashed ? '3 3' : undefined}
                    />
                  );
                })}
                {points.map((p, idx) => (
                  <Circle
                    key={`c-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={dotR}
                    stroke={c.fg}
                    strokeWidth={strokeW}
                    fill={p.ghost ? 'transparent' : c.fg}
                  />
                ))}
              </Svg>
              <View style={{ width: svgWidth, height: moraFontPx + 4 }}>
                {mora.map((m, idx) => (
                  <Text
                    key={`t-${idx}`}
                    allowFontScaling={false}
                    style={[
                      styles.moraText,
                      {
                        color: c.fg,
                        fontFamily: fontFamily.jp,
                        fontSize: moraFontPx,
                        lineHeight: moraFontPx + 2,
                        left: sidePad + idx * moraGap - moraFontPx / 2,
                        width: moraFontPx,
                      },
                    ]}
                  >
                    {m}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  posLabel: {
    fontSize: 10,
    minWidth: 14,
  },
  moraText: {
    position: 'absolute',
    textAlign: 'center',
  },
});
