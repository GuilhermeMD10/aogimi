import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { CardSessionEntry } from '../types';

type Props = {
  entries: CardSessionEntry[];
  limit?: number;
};

const DEFAULT_LIMIT = 3;

/**
 * Difficulty at or above which a card counts as "hard" without having been
 * missed this session, on FSRS-6's [1, 10] scale. `D0(Again)` = 6.41, so 6.0
 * reads as "this card has taken at least one bad grade at some point" without
 * the session needing to contain that grade.
 *
 * **The old threshold was 0.5 on a [0.05, 0.95] scale** — the same *idea*, not
 * a convertible number. Left unchanged through the FSRS-6 port it would have
 * sat below the new minimum of 1.0, so every card would have qualified and the
 * "hardest" list would have quietly become "all cards, in difficulty order".
 */
const HARD_DIFFICULTY = 6.0;

// Top N cards the user struggled with this session. Sort: Again count
// desc, then post-review difficulty desc. Cards with zero Agains can
// still surface if their difficulty climbed (e.g. multiple Hards on a
// previously-mastered card).
export function HardestInSessionList({ entries, limit = DEFAULT_LIMIT }: Props) {
  const c = useColors();
  const t = useT();

  const ranked = entries
    .map((e) => ({
      entry: e,
      agains: e.outcomes.filter((o) => o === 'again').length,
      // Null difficulty (never reviewed, or graded while not due) sorts last
      // and never clears the threshold — "not measured" is not "easy".
      difficulty: e.finalDifficulty ?? 0,
    }))
    .filter((x) => x.agains > 0 || x.difficulty >= HARD_DIFFICULTY)
    .sort((a, b) => {
      if (a.agains !== b.agains) return b.agains - a.agains;
      return b.difficulty - a.difficulty;
    })
    .slice(0, limit);

  if (ranked.length === 0) return null;

  return (
    <View style={styles.list}>
      {ranked.map(({ entry, agains }) => (
        <View
          key={entry.card.id}
          style={[styles.row, { backgroundColor: c.bgElev, borderColor: c.border }]}
        >
          <View style={styles.text}>
            <Text style={[styles.front, { color: c.fg }]} numberOfLines={1}>
              {entry.card.front}
            </Text>
            {entry.card.back.length > 0 && (
              <Text style={[styles.back, { color: c.fgMuted }]} numberOfLines={1}>
                {entry.card.back}
              </Text>
            )}
          </View>
          {agains > 0 && (
            <View style={[styles.badge, { backgroundColor: c.bgSunken }]}>
              <Text style={[styles.badgeText, { color: c.warning }]}>
                {t('study.hardest.again', { n: agains })}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 0 },
  front: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  back: {
    fontSize: fontSize.xs + 1,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamily.ui,
    letterSpacing: 0.3,
  },
});
