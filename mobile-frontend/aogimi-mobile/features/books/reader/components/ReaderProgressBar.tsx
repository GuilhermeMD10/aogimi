import { View, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/ThemeContext';

export type ReaderProgressBarProps = {
  /** Percent 0–100. */
  fraction: number;
  rtl?: boolean;
  /** Bar height in dp. Defaults to 2. */
  height?: number;
  style?: ViewStyle;
};

// ─────────────────────────────────────────────────────────────────────────────
// Soft hairline track + rounded fill
// ─────────────────────────────────────────────────────────────────────────────

export function ReaderProgressBar({ fraction, rtl, height = 2, style }: ReaderProgressBarProps) {
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
