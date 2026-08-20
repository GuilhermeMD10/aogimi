import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import type { RecentLookup } from '@/features/dictionary/lib/dictionaryStorage';
import { usePalette } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { Card, SectionHead } from './HomeCard';

/** How many recent lookups the card shows. The store keeps ten; this is a
 *  glanceable summary, and more than two starts competing with the cards below
 *  it for the same scroll. */
const VISIBLE = 2;

/**
 * The dictionary card: a search affordance and the last couple of words looked
 * up, from anywhere in the app.
 *
 * The "search field" is a `Pressable` styled as an input, not a `TextInput` —
 * typing happens on the dictionary tab, which owns the search stack, the
 * deinflector and the result list. A real input here would need all of that or
 * would hand off mid-word.
 *
 * With no lookups yet the card is the field alone. That is the empty state:
 * a first-run user has nothing to show and does not need to be told so.
 */
export function DictionaryCard({
  title,
  viewAllLabel,
  placeholder,
  recents,
  onOpenDictionary,
  onOpenLookup,
}: {
  title: string;
  viewAllLabel: string;
  placeholder: string;
  recents: RecentLookup[];
  onOpenDictionary: () => void;
  onOpenLookup: (lookup: RecentLookup) => void;
}) {
  const p = usePalette();
  const styles = useStyles(p);
  const shown = recents.slice(0, VISIBLE);

  return (
    <Card>
      <SectionHead title={title} action={viewAllLabel} onPress={onOpenDictionary} />

      <Touchable
        minTarget={false}
        onPress={onOpenDictionary}
        accessibilityRole="search"
        style={styles.field}
      >
        <Feather name="search" size={15} color={p.accent} />
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </Touchable>

      {shown.map((item, i) => (
        <Touchable
          minTarget={false}
          key={item.wordId}
          onPress={() => onOpenLookup(item)}
          accessibilityRole="button"
          style={[
            styles.row,
            // Divider between rows only — a trailing rule under the last one
            // would read as a cut-off card.
            i < shown.length - 1 && { borderBottomWidth: 1, borderBottomColor: p.paperBd },
          ]}
        >
          <Text style={styles.word} numberOfLines={1}>
            {item.headword}
          </Text>
          <View style={styles.gloss}>
            {item.reading !== '' && <Text style={styles.reading}>{item.reading}</Text>}
            {item.gloss !== '' && (
              <Text style={styles.meaning} numberOfLines={1}>
                {item.gloss}
              </Text>
            )}
          </View>
        </Touchable>
      ))}
    </Card>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        // 1.5px and `ink` — this is the one control on Home drawn as an
        // outline rather than a fill, which is what makes it read as "type
        // here" next to two filled buttons.
        field: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm + 1,
          borderWidth: 1.5,
          borderColor: p.ink,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md + 2,
          marginTop: spacing.md,
        },
        placeholder: {
          flex: 1,
          fontFamily: fontFamily.ui,
          fontSize: fontSize.sm + 0.5,
          color: p.faint,
        },

        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md - 1,
          paddingVertical: spacing.md,
          paddingHorizontal: 2,
        },
        // Fixed width so the glosses of consecutive rows line up regardless of
        // headword length — a ragged left edge on a two-row list looks broken.
        word: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xl,
          fontWeight: '500',
          color: p.ink,
          minWidth: 64,
        },
        gloss: { flex: 1, minWidth: 0 },
        reading: {
          fontFamily: fontFamily.jp,
          fontSize: fontSize.xs - 1,
          color: p.faint,
        },
        meaning: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xs + 1,
          color: p.soft,
        },
      }),
    [p],
  );
}
