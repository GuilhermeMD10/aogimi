import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius } from '@/theme/tokens';
import type { CardSessionEntry } from '../types';

type Props = {
  entries: CardSessionEntry[];
};

/** Mirrors `CardState`. The tier between `new` and `learned` is `met` —
 *  renamed from `seen` in migration 027. */
type StateKey = 'new' | 'met' | 'learned' | 'mastered';

// Visualises the per-state distribution of cards at session END.
// Segments laid out new → mastered (low → high tier) so progression
// reads left-to-right. Zero buckets vanish entirely.
export function BreakdownBar({ entries }: Props) {
  const c = useColors();
  const t = useT();

  const counts: Record<StateKey, number> = { new: 0, met: 0, learned: 0, mastered: 0 };
  for (const e of entries) counts[e.endState] += 1;
  const total = entries.length;

  if (total === 0) return null;

  const segments: { key: StateKey; count: number; color: string; label: string }[] = [
    { key: 'new',      count: counts.new,      color: c.fgSubtle, label: t('study.state.new') },
    { key: 'met',      count: counts.met,      color: c.warning,  label: t('study.state.met') },
    { key: 'learned',  count: counts.learned,  color: c.success,  label: t('study.state.learned') },
    { key: 'mastered', count: counts.mastered, color: c.success,  label: t('study.state.mastered') },
  ];
  const visible = segments.filter((s) => s.count > 0);

  return (
    <View>
      <View style={[styles.bar, { backgroundColor: c.bgSunken }]}>
        {visible.map((s) => (
          <View
            key={s.key}
            style={[
              styles.segment,
              { flex: s.count, backgroundColor: s.color, opacity: s.key === 'learned' ? 0.55 : 1 },
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {visible.map((s, i) => (
          <Text key={s.key} style={[styles.label, { color: s.color }]}>
            {s.count} {s.label}
            {i < visible.length - 1 && (
              <Text style={[styles.sep, { color: c.fgSubtle }]}> · </Text>
            )}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  segment: {
    height: '100%',
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.xs + 1,
    fontFamily: fontFamily.ui,
    fontVariant: ['tabular-nums'],
  },
  sep: {
    // Inherits font size from the parent Text run.
  },
});
