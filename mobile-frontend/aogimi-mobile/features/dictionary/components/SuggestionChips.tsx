import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';

/**
 * Three example queries under the search field, so an empty dictionary is
 * something you can tap rather than a blank you have to fill.
 *
 * The words are hardcoded on purpose: they are *seeds*, not data. Deriving
 * them (frequency, JLPT tier, the user's books) would be a feature with a
 * ranking rule behind it; three fixed words that all resolve in the bundled
 * dictionary do the job. 仰ぐ is the app's namesake.
 */
const SUGGESTIONS = ['仰ぐ', 'しょ', '薄暗い'] as const;

export function SuggestionChips({ onPick }: { onPick: (query: string) => void }) {
  const p = usePalette();
  const styles = useStyles(p);
  return (
    <View style={styles.row}>
      {SUGGESTIONS.map((word) => (
        <Touchable
          key={word}
          onPress={() => onPick(word)}
          accessibilityRole="button"
          surface="glass"
          radius={radius.pill}
          // A pill grown to the 44pt floor stops reading as a chip, so the box
          // keeps its shape and slop carries it the rest of the way.
          minTarget={false}
          hitSlop={6}
          style={styles.chip}
        >
          <Text style={styles.label}>{word}</Text>
        </Touchable>
      ))}
    </View>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.sm,
          marginTop: spacing.md + 2,
        },
        chip: {
          paddingHorizontal: spacing.md + 2,
          paddingVertical: 9,
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xs + 1,
          color: p.muted,
        },
      }),
    [p],
  );
}
