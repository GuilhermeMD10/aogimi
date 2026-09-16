import { StyleSheet, View } from 'react-native';

import { Button } from '@/shared/components/Button';
import { Header } from '@/shared/components/Header';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing } from '@/theme/tokens';

/**
 * The focused tier's chrome — `SkyConstellation.dc.html`: the way back out, the
 * deck's name with its figures, its menu, and under that the two things you do
 * with a deck you are standing in.
 *
 * **It renders in every focused state**, so the way back out can never be
 * collapsed away with something else — a phone has no Escape key. Android's
 * hardware back is wired to the same action in the view.
 *
 * The study button reports the due count rather than merely offering to study:
 * since FSRS-6 a review only counts if the card is due, so with `dueCount === 0`
 * the button says so and refuses. The composition's `Study Deck Due · 28` and
 * `List` are 40pt; the primitive's `small` (36pt) is the nearest control and
 * keeps the chrome light over a sky the camera has to fit inside.
 */
export function FocusedDeckHeader({
  name,
  cardCount,
  dueCount,
  onBack,
  onMore,
  onStudy,
  onList,
}: {
  name: string;
  cardCount: number;
  /** `null` while the count is in flight — the figures show a dash. */
  dueCount: number | null;
  onBack: () => void;
  onMore: () => void;
  onStudy: () => void;
  onList: () => void;
}) {
  const t = useT();
  const nothingDue = dueCount === 0;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Header
        size={36}
        title={name}
        japanese
        subtitle={t('sky.starsDue', {
          stars: cardCount.toLocaleString(),
          due: dueCount === null ? '—' : dueCount.toLocaleString(),
        })}
        onBack={onBack}
        backLabel={t('sky.back')}
        onMore={onMore}
        moreLabel={t('sky.deckMenu')}
      />
      <View style={styles.actions}>
        <Button
          label={t('sky.studyDeck')}
          size="small"
          // No badge when nothing is due: a `0` beside a dead button says the
          // same thing twice, and the count reads as a promise.
          badge={dueCount === null || nothingDue ? undefined : dueCount.toLocaleString()}
          disabled={nothingDue}
          onPress={onStudy}
          style={styles.study}
        />
        <Button label={t('sky.list')} variant="secondary" size="small" icon="list" onPress={onList} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  study: { flex: 1 },
});
