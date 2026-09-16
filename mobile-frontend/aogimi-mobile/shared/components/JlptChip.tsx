import { StyleSheet, type ViewStyle } from 'react-native';
import { usePalette } from '@/theme/ThemeContext';
import { Tag } from './Chip';

export type JlptChipProps = {
  /** JLPT level 1–5 (1 = N1 hardest, 5 = N5 easiest). */
  level: number;
  /** Compact = a tighter chip, for inline result rows. */
  compact?: boolean;
  style?: ViewStyle;
};

/**
 * The JLPT level badge — a 6px `Tag` in the level's own colour.
 *
 * **The level→hue mapping is the one standing exception to "semantic colour
 * only"**: the level *is* what the colour means, so the five hues are palette
 * tokens (`jlptN1`…`jlptN5`) rather than a ramp. They come from DESIGN.md for
 * Night and from the Day dictionary composition for Day, where every one is
 * darkened to stay readable on the light canvas.
 *
 * `jlptN5` is the only level whose token is already an `rgba()` — it is "white
 * at 35%", a non-colour for the level that has none. `Tag`'s re-alpha leaves it
 * as-is, so N5 renders as a plain pale chip, which is the intent.
 */
export function JlptChip({ level, compact, style }: JlptChipProps) {
  const p = usePalette();
  const tone =
    level === 1 ? p.jlptN1
    : level === 2 ? p.jlptN2
    : level === 3 ? p.jlptN3
    : level === 4 ? p.jlptN4
    : level === 5 ? p.jlptN5
    : p.muted;

  return (
    <Tag
      label={`N${level}`}
      tone={tone}
      style={StyleSheet.flatten([compact && styles.compact, style])}
    />
  );
}

const styles = StyleSheet.create({
  compact: { paddingHorizontal: 5, paddingVertical: 1 },
});
