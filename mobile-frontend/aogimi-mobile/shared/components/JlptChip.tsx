import { StyleSheet, type ViewStyle } from 'react-native';
import { JLPT_CHIP } from '@/theme/tokens';
import { Tag } from './Chip';

export type JlptChipProps = {
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest). */
  level: number;
  /** Compact = a tighter chip, for inline result rows. */
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * The JLPT level badge — a 6px `Tag` in the level's own two tones.
 *
 * **The colours are fixed and theme-independent** (`JLPT_CHIP` in
 * `theme/tokens.ts`, by the owner's ruling): N5 blue, N4 green, N3 yellow, N2
 * orange, N1 red, each an opaque `inner` fill with an `outer` border and label.
 * The level *is* what the colour means, so the same five chips appear on every
 * screen in either theme — this component does not read the palette at all.
 *
 * An out-of-range level renders nothing: there is no sixth colour to invent.
 */
export function JlptChip({ level, compact, style }: JlptChipProps) {
  const pair = isLevel(level) ? JLPT_CHIP[level] : null;
  if (pair === null) return null;

  return (
    <Tag
      label={`N${level}`}
      tone={pair.outer}
      fill={pair.inner}
      border={pair.outer}
      style={StyleSheet.flatten([compact && styles.compact, style])}
    />
  );
}

function isLevel(n: number): n is 1 | 2 | 3 | 4 | 5 {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

const styles = StyleSheet.create({
  compact: { paddingHorizontal: 5, paddingVertical: 1 },
});
