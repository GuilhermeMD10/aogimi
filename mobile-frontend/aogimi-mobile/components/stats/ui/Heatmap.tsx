import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';

type DayCount = { date: string; count: number };

type Props = {
  perDay: DayCount[];
};

const WEEKS = 52;
const DAYS_PER_WEEK = 7;
const CELL = 12;
const GAP = 2;

// Year-long activity heatmap. 52 columns (weeks) × 7 rows (days),
// aligned to the most recent Sunday on the right. Phone screens can't
// show this without scroll — wrap in a horizontal ScrollView and let
// the user pan. Most recent week stays in view first, scrolling left
// reveals older history.

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function intensityColor(count: number, theme: { success: string; bgSunken: string }): string {
  if (count === 0) return theme.bgSunken;
  // Three intensity bands above zero. Aligned with CardGridItem's
  // precedent for using rgba state colors in components — the
  // alternative (overlay views or per-tier theme tokens) would add
  // more surface than the visual variety is worth.
  if (count <= 3) return 'rgba(59, 122, 64, 0.25)';
  if (count <= 9) return 'rgba(59, 122, 64, 0.55)';
  return theme.success;
}

export function Heatmap({ perDay }: Props) {
  const c = useColors();

  const columns = useMemo(() => {
    const dateToCount = new Map(perDay.map((d) => [d.date, d.count] as const));
    const today = startOfDay(new Date());
    const todayTs = today.getTime();

    // Latest Sunday — same as today if today is Sunday.
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());

    const cols: { date: Date; count: number; isFuture: boolean }[][] = [];
    for (let c = WEEKS - 1; c >= 0; c--) {
      const weekStart = new Date(lastSunday);
      weekStart.setDate(lastSunday.getDate() - c * DAYS_PER_WEEK);
      const week: { date: Date; count: number; isFuture: boolean }[] = [];
      for (let r = 0; r < DAYS_PER_WEEK; r++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + r);
        const iso = isoDate(day);
        week.push({
          date: day,
          count: dateToCount.get(iso) ?? 0,
          isFuture: day.getTime() > todayTs,
        });
      }
      cols.push(week);
    }
    return cols;
  }, [perDay]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.grid}>
        {columns.map((week, ci) => (
          <View key={ci} style={styles.column}>
            {week.map((cell, ri) => (
              <View
                key={ri}
                style={[
                  styles.cell,
                  {
                    backgroundColor: cell.isFuture
                      ? 'transparent'
                      : intensityColor(cell.count, c),
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: spacing.sm },
  grid: { flexDirection: 'row', gap: GAP },
  column: { flexDirection: 'column', gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
});
