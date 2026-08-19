import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, spacing, type Palette } from '@/theme/tokens';

export type ProfileStat = {
  value: number;
  label: string;
  /** Draws the value in `gold` — used to highlight the star count. */
  highlight?: boolean;
};

/**
 * The three-cell stat strip: value over mono micro-label, hairline dividers.
 *
 * **Deliberately no "SESSIONS" cell — this app cannot count them.** Nothing
 * server-side records a study session as an entity — `study_days` rolls
 * reviews up per calendar day and `card_reviews` logs individual grades, so
 * any "sessions" number would be invented. The strip is DAYS STUDIED ·
 * MASTERED · STARS instead: three figures the API actually returns.
 *
 * DAYS STUDIED is a count of distinct days, **not** a consecutive streak. The
 * label says what the number is.
 */
export function ProfileStats({ stats }: { stats: ProfileStat[] }) {
  const p = usePalette();
  const styles = useStyles(p);

  return (
    <Card padded={false} clip style={styles.card}>
      <View style={styles.row}>
        {stats.map((s, i) => (
          <View key={s.label} style={styles.cellWrap}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.cell}>
              <Text style={[styles.value, s.highlight === true && styles.valueGold]}>
                {/* Thousands separators: the star count reaches four digits
                    quickly and reads as noise without them. */}
                {s.value.toLocaleString()}
              </Text>
              <Text style={styles.label}>{s.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: { marginTop: spacing.lg + 2 },
        row: { flexDirection: 'row', alignItems: 'stretch' },
        // The wrapper carries the flex share and hosts the divider, so the
        // divider is full-height regardless of how tall the cell's text runs.
        cellWrap: { flex: 1, flexDirection: 'row' },
        divider: { width: 1, backgroundColor: p.paperBd },
        cell: {
          flex: 1,
          alignItems: 'center',
          gap: 4,
          paddingVertical: spacing.md + 2,
        },
        value: {
          fontFamily: fontFamily.mono,
          fontSize: fontSize.xl - 1,
          fontWeight: '700',
          color: p.ink,
        },
        valueGold: { color: p.gold },
        label: {
          fontFamily: fontFamily.mono,
          fontSize: 8,
          letterSpacing: 1.1,
          color: p.faint,
        },
      }),
    [p],
  );
}
