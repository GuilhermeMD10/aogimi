import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, spacing } from '@/theme/tokens';
import type { EpubTocItem } from './foliateHtml';

type Props = {
  visible: boolean;
  toc: EpubTocItem[];
  onDismiss: () => void;
  onNavigate: (href: string) => void;
};

export function TocSheet({ visible, toc, onDismiss, onNavigate }: Props) {
  const c = useColors();
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.65}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>Contents</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {toc.length === 0 ? (
          <Text style={[styles.empty, { color: c.fgMuted }]}>
            No table of contents
          </Text>
        ) : (
          toc.map((item, i) => (
            <Pressable
              key={`${item.href}-${i}`}
              onPress={() => {
                onNavigate(item.href);
                onDismiss();
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: c.border,
                  backgroundColor: pressed ? c.bgSunken : 'transparent',
                },
              ]}
            >
              <Text
                numberOfLines={2}
                style={[styles.label, { color: c.fg }]}
              >
                {item.label || item.href}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
