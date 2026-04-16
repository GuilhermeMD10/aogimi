import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import {
  HIGHLIGHT_COLORS,
  type EpubBookmark,
  type EpubHighlight,
  type PdfBookmark,
} from './useBookStorage';

type Tab = 'bookmarks' | 'highlights';

interface AnnotationsPanelProps {
  visible: boolean;
  onClose: () => void;

  epubHighlights: EpubHighlight[];
  epubBookmarks: EpubBookmark[];
  pdfBookmarks: PdfBookmark[];

  onJumpEpubHighlight?: (h: EpubHighlight) => void;
  onDeleteEpubHighlight?: (id: string) => void;
  onJumpEpubBookmark?: (b: EpubBookmark) => void;
  onDeleteEpubBookmark?: (id: string) => void;
  onJumpPdfBookmark?: (b: PdfBookmark) => void;
  onDeletePdfBookmark?: (id: string) => void;
}

/**
 * Modal side-panel listing the current book's annotations.
 *
 * Two tabs:
 *   - Bookmarks — merged EPUB + PDF bookmarks, sorted newest-first.
 *   - Highlights — EPUB-only (PDF highlights aren't persisted).
 *
 * Rows: tap to jump (the reader will scroll to the cfi/page); long-press the
 * trailing "✕" to delete. Mirrors the web's `AnnotationsPanel` behaviour.
 */
export function AnnotationsPanel({
  visible,
  onClose,
  epubHighlights,
  epubBookmarks,
  pdfBookmarks,
  onJumpEpubHighlight,
  onDeleteEpubHighlight,
  onJumpEpubBookmark,
  onDeleteEpubBookmark,
  onJumpPdfBookmark,
  onDeletePdfBookmark,
}: AnnotationsPanelProps) {
  const styles = useThemedStyles(createStyles);
  const c = useColors();
  const [tab, setTab] = useState<Tab>('bookmarks');

  const allBookmarks = [
    ...epubBookmarks.map((b) => ({ kind: 'epub' as const, ...b })),
    ...pdfBookmarks.map((b)  => ({ kind: 'pdf' as const,  ...b })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Annotations</Text>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            <TabButton label="Bookmarks" active={tab === 'bookmarks'} onPress={() => setTab('bookmarks')} styles={styles} rippleColor={c.border} />
            <TabButton label="Highlights" active={tab === 'highlights'} onPress={() => setTab('highlights')} styles={styles} rippleColor={c.border} />
          </View>

          {tab === 'bookmarks' ? (
            allBookmarks.length === 0 ? (
              <EmptyState text="No bookmarks yet" styles={styles} />
            ) : (
              <FlatList
                data={allBookmarks}
                keyExtractor={(b) => `${b.kind}-${b.id}`}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <Separator styles={styles} />}
                renderItem={({ item }) => (
                  <BookmarkRow
                    label={item.label}
                    subLabel={item.kind === 'pdf' ? `Page ${item.page}` : 'EPUB'}
                    onJump={() => {
                      if (item.kind === 'epub') onJumpEpubBookmark?.(item);
                      else onJumpPdfBookmark?.(item);
                    }}
                    onDelete={() => {
                      if (item.kind === 'epub') onDeleteEpubBookmark?.(item.id);
                      else onDeletePdfBookmark?.(item.id);
                    }}
                    styles={styles}
                    rippleColor={c.border}
                  />
                )}
              />
            )
          ) : epubHighlights.length === 0 ? (
            <EmptyState text="No highlights yet" styles={styles} />
          ) : (
            <FlatList
              data={[...epubHighlights].sort((a, b) => b.createdAt - a.createdAt)}
              keyExtractor={(h) => h.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <Separator styles={styles} />}
              renderItem={({ item }) => (
                <HighlightRow
                  highlight={item}
                  onJump={() => onJumpEpubHighlight?.(item)}
                  onDelete={() => onDeleteEpubHighlight?.(item.id)}
                  styles={styles}
                  rippleColor={c.border}
                />
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type Styles = ReturnType<typeof createStyles>;

function TabButton({ label, active, onPress, styles, rippleColor }: { label: string; active: boolean; onPress: () => void; styles: Styles; rippleColor: string }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [
        styles.tabBtn,
        active && styles.tabBtnActive,
        pressed && !active && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function BookmarkRow({
  label,
  subLabel,
  onJump,
  onDelete,
  styles,
  rippleColor,
}: {
  label: string;
  subLabel: string;
  onJump: () => void;
  onDelete: () => void;
  styles: Styles;
  rippleColor: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onJump}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [styles.rowBody, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.rowSub}>{subLabel}</Text>
      </Pressable>
      <DeleteBtn onPress={onDelete} styles={styles} rippleColor={rippleColor} />
    </View>
  );
}

function HighlightRow({
  highlight,
  onJump,
  onDelete,
  styles,
  rippleColor,
}: {
  highlight: EpubHighlight;
  onJump: () => void;
  onDelete: () => void;
  styles: Styles;
  rippleColor: string;
}) {
  return (
    <View style={styles.row}>
      <View
        style={[styles.colorDot, { backgroundColor: HIGHLIGHT_COLORS[highlight.color] }]}
      />
      <Pressable
        onPress={onJump}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [styles.rowBody, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.rowLabel} numberOfLines={2}>{highlight.text}</Text>
      </Pressable>
      <DeleteBtn onPress={onDelete} styles={styles} rippleColor={rippleColor} />
    </View>
  );
}

function DeleteBtn({ onPress, styles, rippleColor }: { onPress: () => void; styles: Styles; rippleColor: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      android_ripple={{ color: rippleColor, borderless: true }}
      style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.deleteLabel}>✕</Text>
    </Pressable>
  );
}

function Separator({ styles }: { styles: Styles }) {
  return <View style={styles.sep} />;
}

function EmptyState({ text, styles }: { text: string; styles: Styles }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.empty}>{text}</Text>
    </View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.backdrop,
    justifyContent: 'flex-end',
  },
  panel: {
    height: '70%',
    backgroundColor: c.bgBase,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.serifSemiBold,
    fontWeight: '600',
    color: c.textPrimary,
  },
  close: {
    fontSize: fontSize.lg,
    color: c.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    backgroundColor: c.bgSurface,
  },
  tabBtnActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: c.textPrimary,
  },
  tabLabelActive: { color: c.accentOn },

  listContent: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingRight: spacing.sm,
  },
  rowBody: {
    flex: 1,
    padding: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  rowSub: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: spacing.md,
  },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteLabel: {
    fontSize: fontSize.md,
    color: c.textSecondary,
  },
  sep: { height: spacing.sm },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
});
