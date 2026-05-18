import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { fontSize, spacing } from '@/theme/tokens';
import {
  HIGHLIGHT_COLORS,
  type EpubBookmark,
  type EpubHighlight,
} from '@/lib/readerStorage';

type Tab = 'bookmarks' | 'highlights';

type Props = {
  visible: boolean;
  bookmarks: EpubBookmark[];
  highlights: EpubHighlight[];
  onDismiss: () => void;
  onJumpBookmark: (b: EpubBookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onJumpHighlight: (h: EpubHighlight) => void;
  onDeleteHighlight: (id: string) => void;
};

export function AnnotationsSheet({
  visible,
  bookmarks,
  highlights,
  onDismiss,
  onJumpBookmark,
  onDeleteBookmark,
  onJumpHighlight,
  onDeleteHighlight,
}: Props) {
  const c = useColors();
  const [tab, setTab] = useState<Tab>('bookmarks');

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.7}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>Annotations</Text>
      </View>

      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {(['bookmarks', 'highlights'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              tab === t && {
                borderBottomColor: c.accent,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: tab === t ? c.fg : c.fgMuted },
              ]}
            >
              {t === 'bookmarks'
                ? `Bookmarks (${bookmarks.length})`
                : `Highlights (${highlights.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'bookmarks' &&
          (bookmarks.length === 0 ? (
            <Text style={[styles.empty, { color: c.fgMuted }]}>
              No bookmarks yet
            </Text>
          ) : (
            bookmarks.map((b) => (
              <Row
                key={b.id}
                onJump={() => {
                  onJumpBookmark(b);
                  onDismiss();
                }}
                onDelete={() => onDeleteBookmark(b.id)}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.rowLabel, { color: c.fg }]}
                >
                  {b.label}
                </Text>
              </Row>
            ))
          ))}

        {tab === 'highlights' &&
          (highlights.length === 0 ? (
            <Text style={[styles.empty, { color: c.fgMuted }]}>
              No highlights yet
            </Text>
          ) : (
            highlights.map((h) => (
              <Row
                key={h.id}
                onJump={() => {
                  onJumpHighlight(h);
                  onDismiss();
                }}
                onDelete={() => onDeleteHighlight(h.id)}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: HIGHLIGHT_COLORS[h.color] },
                  ]}
                />
                <Text
                  numberOfLines={2}
                  style={[styles.rowLabel, { color: c.fg, flex: 1 }]}
                >
                  {h.text}
                </Text>
              </Row>
            ))
          ))}
      </ScrollView>
    </BottomSheet>
  );
}

function Row({
  onJump,
  onDelete,
  children,
}: {
  onJump: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: c.border }]}>
      <Pressable onPress={onJump} style={styles.rowLeft} hitSlop={4}>
        {children}
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Text style={[styles.deleteIcon, { color: c.fgMuted }]}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabLabel: { fontSize: fontSize.sm, fontWeight: '500' },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  empty: {
    fontSize: fontSize.sm,
    padding: spacing.xl,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: { fontSize: fontSize.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  deleteBtn: { paddingHorizontal: 6 },
  deleteIcon: { fontSize: 22, lineHeight: 22 },
});
