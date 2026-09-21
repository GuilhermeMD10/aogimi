import { StyleSheet, View } from 'react-native';
import { Tag } from '@/shared/components/Chip';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { SummaryRow } from './SummaryRow';
import type { HardCard } from '../lib/sessionStats';

/**
 * **Hardest cards** — the ones the user struggled with, each with its miss
 * count as a chip in the Again tint.
 *
 * Takes the ranked list rather than the raw entries so the section around it
 * can know whether there is anything to show *before* it draws a heading and
 * a divider over it. `hardestOf` does the ranking and says what qualifies.
 */
export function HardestInSessionList({ cards }: { cards: HardCard[] }) {
  const p = usePalette();
  const t = useT();

  return (
    <View style={styles.list}>
      {cards.map(({ card, misses }) => (
        <SummaryRow
          key={card.id}
          card={card}
          right={
            misses > 0 ? (
              <Tag
                // The mock prints `1 MISSES`; a build should not.
                label={misses === 1 ? t('study.finish.miss') : t('study.finish.misses', { n: misses })}
                tone={p.srsAgain}
              />
            ) : null
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
});
