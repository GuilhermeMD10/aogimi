import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, spacing } from '@/theme/tokens';
import type { EpubTocItem } from '../../lib/foliateHtml';

type Props = {
  toc: EpubTocItem[];
  onNavigate: (href: string) => void;
};

/** Pure TOC content. The dock provides the rounded-top frame, handle, and
 *  size — this component is just the header + scrollable list. */
export function TocPane({ toc, onNavigate }: Props) {
  const c = useColors();
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>Contents</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {toc.length === 0 ? (
          <Text style={[styles.empty, { color: c.fgMuted }]}>No table of contents</Text>
        ) : (
          toc.map((item, i) => (
            <Pressable
              key={`${item.href}-${i}`}
              onPress={() => onNavigate(item.href)}
              style={[styles.row, { borderBottomColor: c.border }]}
            >
              <Text numberOfLines={2} style={[styles.label, { color: c.fg }]}>
                {item.label || item.href}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  empty: { fontSize: fontSize.sm, padding: spacing.lg, textAlign: 'center' },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: fontSize.sm },
});
