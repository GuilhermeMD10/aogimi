import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { StateTag } from '@/shared/components/StateTag';
import { RANK_COLORS } from '@/features/sky/map/lib/palette';
import { usePalette, spacing, type } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import { MIX_ORDER } from '../../stage/lib/masteryMix';
import { SummaryRow } from './SummaryRow';
import type { CardState } from '../../stage/types';
import type { TierUpgrade } from '../lib/sessionStats';

/** As many rows as the composition draws; the rest become the `N MORE` line. */
const SHOWN = 3;

/**
 * **Tier upgrades** — the cards that climbed a rung this session, drawn as
 * `Met → Learned`.
 *
 * The two tags take their colour from `RANK_COLORS`, the star map's own ramp,
 * and **not** from the handoff's mastery ladder: the brief settles this — a
 * dot that names a rank has to be the colour that rank's star is drawn in, or
 * a summary row and the sky it describes disagree in front of the user.
 *
 * `tierUpgradesOf` decides what counts as a climb and why it is the raw state
 * rather than the displayed one.
 */
export function TierUpgradesList({ upgrades }: { upgrades: TierUpgrade[] }) {
  const p = usePalette();
  const t = useT();
  if (upgrades.length === 0) return null;

  const shown = upgrades.slice(0, SHOWN);
  const overflow = upgrades.length - shown.length;

  return (
    <View style={styles.list}>
      {shown.map(({ card, from, to }) => (
        <SummaryRow
          key={card.id}
          card={card}
          right={
            <View style={styles.transition}>
              <StateTag label={t(`sky.rank.${from}`)} tone={rankColor(from)} />
              <Feather name="arrow-right" size={12} color={p.faint} />
              <StateTag label={t(`sky.rank.${to}`)} tone={rankColor(to)} />
            </View>
          }
        />
      ))}
      {overflow > 0 && (
        <Text style={[styles.more, { color: p.faint }]}>
          {t('study.finish.more', { n: overflow })}
        </Text>
      )}
    </View>
  );
}

/** The `state` → ladder index → ramp chain every piece of rank chrome walks. */
function rankColor(state: CardState): string {
  return RANK_COLORS[MIX_ORDER.indexOf(state)] ?? RANK_COLORS[0];
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  transition: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  more: {
    ...type.eyebrow,
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
    paddingTop: spacing.xs,
  },
});
