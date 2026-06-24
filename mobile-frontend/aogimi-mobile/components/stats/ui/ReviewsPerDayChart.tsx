import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize } from '@/theme/tokens';

type DayCount = { date: string; count: number };

type Props = {
  perDay: DayCount[];
  /** How many trailing days to plot. Defaults to 30. */
  windowDays?: number;
};

// Recent-window bar chart. Fixed-width bars laid out in a row; total
// width fits in a typical phone screen at the default window (30 days
// × ~10px). Bars vertically scaled to the max value in the window so
// the busiest day always lands at full height.
export function ReviewsPerDayChart({ perDay, windowDays = 30 }: Props) {
  const c = useColors();

  const series = useMemo(() => {
    const dateToCount = new Map(perDay.map((d) => [d.date, d.count] as const));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { iso: string; count: number }[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ iso, count: dateToCount.get(iso) ?? 0 });
    }
    return out;
  }, [perDay, windowDays]);

  const max = series.reduce((m, x) => Math.max(m, x.count), 1);

  return (
    <View>
      <View style={[styles.frame, { borderColor: c.border }]}>
        <View style={styles.bars}>
          {series.map((d, i) => {
            const heightPct = max > 0 ? (d.count / max) * 100 : 0;
            return (
              <View key={d.iso} style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(heightPct, d.count > 0 ? 4 : 0)}%`,
                      backgroundColor: d.count > 0 ? c.success : 'transparent',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.legendRow}>
        <Text style={[styles.legend, { color: c.fgSubtle }]}>
          {series[0]?.iso.slice(5) ?? ''}
        </Text>
        <Text style={[styles.legend, { color: c.fgSubtle }]}>
          {series[series.length - 1]?.iso.slice(5) ?? ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 80,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    justifyContent: 'flex-end',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 2,
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 0,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  legend: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.ui,
    fontVariant: ['tabular-nums'],
  },
});
