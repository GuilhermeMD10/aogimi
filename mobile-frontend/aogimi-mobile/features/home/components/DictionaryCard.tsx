import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Touchable } from '@/shared/components/Touchable';
import { Card, InnerPlate } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import type { RecentLookup } from '@/features/dictionary/lib/dictionaryStorage';
import { usePalette } from '@/theme/ThemeContext';
import { radius, spacing, type, type Palette } from '@/theme/tokens';

/** How many recent lookups fit the chip row before it starts scrolling. Three
 *  is what the handoff draws and what a 390pt screen holds at this size. */
const VISIBLE = 3;

/**
 * The dictionary card: a search affordance, and the last few words looked up
 * from anywhere in the app as chips under it.
 *
 * The "search field" is a `Touchable` styled as an input, not a `TextInput` —
 * typing happens on the dictionary tab, which owns the search stack, the
 * deinflector and the result list. A real input here would need all of that or
 * would hand off mid-word.
 *
 * With no lookups yet the card is the field alone. That is the empty state: a
 * first-run user has nothing to show and does not need to be told so.
 *
 * ── Why the padding is 12 and not 16 ───────────────────────────────────────
 * DESIGN.md's search field "sits inside a card with 12px padding around it" —
 * the one documented exception to the 16pt card padding, because a 48pt field
 * inside 16pt padding makes the card taller than the content it holds.
 */
export function DictionaryCard({
  placeholder,
  recents,
  searchLabel,
  onOpenDictionary,
  onOpenLookup,
}: {
  placeholder: string;
  recents: RecentLookup[];
  searchLabel: string;
  onOpenDictionary: () => void;
  onOpenLookup: (lookup: RecentLookup) => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  const shown = recents.slice(0, VISIBLE);

  return (
    <Card padded={false} style={styles.card}>
      <Touchable
        minTarget={false}
        onPress={onOpenDictionary}
        accessibilityRole="search"
        accessibilityLabel={searchLabel}
        radius={radius.control}
      >
        <InnerPlate style={styles.field}>
          <Feather name="search" size={16} color={p.faint} />
          <Text style={styles.placeholder} numberOfLines={1}>
            {placeholder}
          </Text>
        </InnerPlate>
      </Touchable>

      {shown.length > 0 && (
        // Horizontal rather than wrapping: a headword can be one character or
        // six, so a wrapping row changes the card's height as the user looks
        // words up. Scrolling keeps it a fixed two-line card.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {shown.map((item) => (
            <Chip
              key={item.wordId}
              label={item.headword}
              japanese
              size="sm"
              onPress={() => onOpenLookup(item)}
            />
          ))}
        </ScrollView>
      )}
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        card: { padding: spacing.md, gap: spacing.sm + 2 },
        field: {
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md + 2,
        },
        placeholder: {
          flex: 1,
          // The placeholder is Japanese, so it takes the JP face rather than
          // the UI one — a mixed-script string set in Switzer falls back
          // per-glyph and the kana end up a different weight to the kanji.
          fontFamily: type.titleReading.fontFamily,
          fontSize: 13,
          color: p.faint,
        },
        chips: { flexDirection: 'row', gap: 6 },
      }),
    [p],
  );
}
