import { IconButton } from '@/shared/components/IconButton';

/**
 * The "add to deck" circle at the end of a result row — DESIGN.md's "40px
 * circle `+` button in accent glass".
 *
 * `accent` is the leading row's: the compositions draw the top result's circle
 * in accent glass and every other row's in Tier 1, so the ranked answer reads
 * as the one to add without the row itself changing.
 *
 * **Not on every row.** Names have no card builder — `cardDraft.ts` produces
 * word and kanji drafts only — and a recent-lookup row holds a snapshot without
 * the meanings a draft needs. Both are documented where they are omitted.
 */
export function AddButton({
  onPress,
  accessibilityLabel,
  accent = false,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  accent?: boolean;
}) {
  return (
    <IconButton
      icon="plus"
      size={40}
      tier={1}
      accent={accent}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
