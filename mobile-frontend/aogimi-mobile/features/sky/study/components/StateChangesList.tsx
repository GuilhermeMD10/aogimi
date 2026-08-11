import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize } from '@/theme/tokens';
import type { CardSessionEntry } from '../types';

type Props = {
  entries: CardSessionEntry[];
};

type TransitionKey =
  | 'firstReviewed'       // new → met
  | 'advanced'            // met → learned
  | 'reachedMastered'     // learned → mastered
  | 'regressedToMet'      // learned → met
  | 'regressedToLearned'; // mastered → learned

// Counts the net per-card transitions for the session and renders one
// row per non-zero bucket. Only NET changes matter — a card that
// bounced learned → met → learned within the session reads as "no
// change" because end-state matches start-state.
//
// Note these are transitions of the card's *current* rank, which is what a
// session report should show: the user wants to know what this sitting did.
// The star on the sky draws `displayedRank()` instead, so a regression row
// here does not mean a star visibly demoted.
export function StateChangesList({ entries }: Props) {
  const c = useColors();
  const t = useT();

  const counts: Record<TransitionKey, number> = {
    firstReviewed: 0,
    advanced: 0,
    reachedMastered: 0,
    regressedToMet: 0,
    regressedToLearned: 0,
  };

  for (const e of entries) {
    if (e.startState === e.endState) continue;
    if (e.startState === 'new'      && e.endState === 'met')      counts.firstReviewed += 1;
    else if (e.startState === 'met'      && e.endState === 'learned')  counts.advanced += 1;
    else if (e.startState === 'learned'  && e.endState === 'mastered') counts.reachedMastered += 1;
    else if (e.startState === 'learned'  && e.endState === 'met')      counts.regressedToMet += 1;
    else if (e.startState === 'mastered' && e.endState === 'learned')  counts.regressedToLearned += 1;
  }

  type Row = { key: TransitionKey; positive: boolean; n: number; labelKey: string };
  const allRows: Row[] = [
    { key: 'firstReviewed',      positive: true,  n: counts.firstReviewed,      labelKey: 'study.changes.firstReviewed' },
    { key: 'advanced',           positive: true,  n: counts.advanced,           labelKey: 'study.changes.advanced' },
    { key: 'reachedMastered',    positive: true,  n: counts.reachedMastered,    labelKey: 'study.changes.reachedMastered' },
    { key: 'regressedToLearned', positive: false, n: counts.regressedToLearned, labelKey: 'study.changes.regressedToLearned' },
    { key: 'regressedToMet',    positive: false, n: counts.regressedToMet,    labelKey: 'study.changes.regressedToMet' },
  ];
  const rows = allRows.filter((r) => r.n > 0);

  if (rows.length === 0) return null;

  return (
    <View style={styles.list}>
      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <Text style={[styles.marker, { color: r.positive ? c.success : c.warning }]}>
            {r.positive ? '→' : '↓'}
          </Text>
          <Text style={[styles.text, { color: c.fg }]}>
            {t(r.labelKey, { n: r.n })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marker: {
    fontSize: fontSize.md,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: fontSize.sm + 1,
    fontFamily: fontFamily.ui,
    flex: 1,
  },
});
