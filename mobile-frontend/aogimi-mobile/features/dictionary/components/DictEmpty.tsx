import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, radius, spacing } from '@/theme/tokens';
import type { RecentSearchItem } from '../lib/dictionaryStorage';

type Props = {
  query: string;
  setQuery: (v: string) => void;
  recents: RecentSearchItem[];
  onPickRecent: (q: string) => void;
  onSettings?: () => void;
  /** When true the recents carousel is hidden (results render below the
   *  card instead) — the rest of the card stays put so the search bar
   *  never shifts position between empty and searching states. */
  isSearching?: boolean;
};

/** Empty-state hero card. Sits at the top of the dictionary tab when no
 *  query is active. Contains a settings button (top-right), a large mincho
 *  watermark, the headline + caption stack from the design, the search
 *  field, and a horizontal carousel of recent lookups (max 10, kept in
 *  AsyncStorage). The search bar lives inside the card so the input never
 *  jumps when the user starts typing. */
export function DictEmpty({ query, setQuery, recents, onPickRecent, onSettings, isSearching }: Props) {
  const c = useColors();
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.card, { backgroundColor: c.bgElev, borderColor: c.border }]}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.watermark, { color: c.fg, fontFamily: fontFamily.jp }]}
      >
        辞書
      </Text>

      <Pressable
        onPress={onSettings}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dictionary settings"
        style={[styles.settingsBtn, { borderColor: c.border }]}
      >
        <Feather name="settings" size={16} color={c.fgMuted} />
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.kicker, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
          辞 書 · DICT
        </Text>
        <Text style={[styles.headline, { color: c.fg, fontFamily: fontFamily.displayBold }]}>
          Look something up
        </Text>
        <Text style={[styles.caption, { color: c.fgMuted, fontFamily: fontFamily.reader }]}>
          Kanji, kana, or English. JMdict and the books you&rsquo;ve read.
        </Text>

        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={[
            styles.searchField,
            // Was a hardcoded `#FFFFFF` from the pre-Midnight light theme, which
            // is what put white ink on a white bar. Tokens now, so the field
            // follows the palette wherever it goes next.
            { backgroundColor: c.bgElev, borderColor: c.border },
          ]}
        >
          <Feather name="search" size={16} color={c.fgSubtle} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="辞書を引く…"
            placeholderTextColor={c.fgSubtle}
            style={[styles.searchInput, { color: c.fg, fontFamily: fontFamily.jp }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Feather name="x" size={16} color={c.fgMuted} />
            </Pressable>
          )}
        </Pressable>

        {!isSearching && (
          <RecentsCarousel
            recents={recents}
            onPickRecent={onPickRecent}
            fgColor={c.fg}
            mutedColor={c.fgMuted}
            subtleColor={c.fgSubtle}
            borderColor={c.border}
            bgColor={c.bg}
          />
        )}
      </View>
    </View>
  );
}

function RecentsCarousel({
  recents,
  onPickRecent,
  fgColor,
  mutedColor,
  subtleColor,
  borderColor,
  bgColor,
}: {
  recents: RecentSearchItem[];
  onPickRecent: (q: string) => void;
  fgColor: string;
  mutedColor: string;
  subtleColor: string;
  borderColor: string;
  bgColor: string;
}) {
  return (
    <View style={styles.recentsBlock}>
      <View style={styles.recentsHeader}>
        <Text style={[styles.recentsLabel, { color: subtleColor, fontFamily: fontFamily.ui }]}>
          最 近 · RECENT
        </Text>
        {recents.length === 0 && (
          <Text style={[styles.recentsEmpty, { color: mutedColor, fontFamily: fontFamily.reader }]}>
            Your lookups will land here.
          </Text>
        )}
      </View>

      {recents.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentsRow}
          keyboardShouldPersistTaps="handled"
        >
          {recents.map((it) => (
            <Pressable
              key={it.at}
              onPress={() => onPickRecent(it.query)}
              accessibilityRole="button"
              accessibilityLabel={`Search ${it.query}`}
              style={[styles.recentChip, { borderColor, backgroundColor: bgColor }]}
            >
              <Text
                style={[styles.recentChipText, { color: fgColor, fontFamily: fontFamily.jp }]}
                numberOfLines={1}
              >
                {it.query}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    right: -48,
    bottom: -88,
    fontSize: 240,
    lineHeight: 240,
    opacity: 0.05,
    fontWeight: '600',
    pointerEvents: 'none' as never,
  },
  settingsBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  content: {
    gap: 6,
    zIndex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  caption: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 280,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
    // Subtle elevation — keeps the input bar above the card surface.
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  recentsBlock: {
    marginTop: spacing.lg,
  },
  recentsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recentsLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  recentsEmpty: {
    fontSize: 12,
  },
  recentsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  recentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  recentChipText: {
    fontSize: 15,
  },
});
