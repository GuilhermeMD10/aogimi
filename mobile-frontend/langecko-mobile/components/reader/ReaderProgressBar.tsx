import { View, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { createThemedComponent } from '@/theme/createThemedComponent';

export type ReaderProgressBarProps = {
  /** Percent 0–100. */
  fraction: number;
  rtl?: boolean;
  /** Bar height in dp. Defaults to 2 (default theme) / 8 (stamp). */
  height?: number;
  style?: ViewStyle;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default — soft hairline track + rounded fill
// ─────────────────────────────────────────────────────────────────────────────

function DefaultReaderProgressBar({ fraction, rtl, height = 2, style }: ReaderProgressBarProps) {
  const c = useColors();
  const w = `${Math.max(0, Math.min(100, fraction))}%` as const;
  return (
    <View
      style={[
        {
          height,
          borderRadius: 99,
          overflow: 'hidden',
          backgroundColor: c.bgSunken,
        },
        style,
      ]}
    >
      <View
        style={{
          height: '100%',
          width: w,
          backgroundColor: c.fg,
          borderRadius: 99,
          alignSelf: rtl ? 'flex-end' : 'flex-start',
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stamp — 8px sumi-bordered rectangle on a paper-deep track, vermillion fill
// with a fine vertical hatch overlay (per the Stamp DS .progress > i pattern).
// ─────────────────────────────────────────────────────────────────────────────

function StampReaderProgressBar({ fraction, rtl, height = 8, style }: ReaderProgressBarProps) {
  const c = useColors();
  const pct = Math.max(0, Math.min(100, fraction));

  // Render the hatch with stripes of solid vermillion separated by 1px gaps —
  // the gap lets the underlying ink shadow show through, mimicking the web's
  // repeating-linear-gradient overlay.
  const hatchCount = Math.ceil((pct * 4) / 100); // ~4 stripes per 100%

  return (
    <View
      style={[
        {
          height,
          backgroundColor: c.bgSunken,
          borderColor: c.fg,
          borderWidth: 1,
          borderRadius: 0,
          overflow: 'hidden',
          flexDirection: rtl ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: c.accent,
          flexDirection: 'row',
        }}
      >
        {Array.from({ length: hatchCount }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              borderRightWidth: 1,
              borderRightColor: 'rgba(0,0,0,0.18)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

export const ReaderProgressBar = createThemedComponent<ReaderProgressBarProps>(
  DefaultReaderProgressBar,
  { stamp: StampReaderProgressBar },
  'ReaderProgressBar',
);
