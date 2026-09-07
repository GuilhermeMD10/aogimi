import { ScrollView } from 'react-native';
import { spacing } from '@/theme/tokens';
import type { WordDetails } from '../types';
import { EntryView } from './EntryView';

/**
 * The body of a **detail** frame: one entry, scrolled.
 *
 * Thin on purpose — `EntryView` is the entry, and is shared with the reader's
 * drawer, which supplies its own scroll. This is the page's half of that split:
 * the scroll container and the clearance for the dock the pane runs under.
 */
export function EntryPane({
  details,
  query,
  bottomInset,
  onAddToDeck,
  onKanjiPress,
}: {
  details: WordDetails;
  /** The query that led here — picks which headword the entry leads with. */
  query: string;
  bottomInset: number;
  onAddToDeck: () => void;
  onKanjiPress: (literal: string) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: bottomInset + spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <EntryView
        details={details}
        query={query}
        onAddToDeck={onAddToDeck}
        onKanjiPress={onKanjiPress}
      />
    </ScrollView>
  );
}
