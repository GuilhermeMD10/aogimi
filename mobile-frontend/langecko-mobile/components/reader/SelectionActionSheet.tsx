import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';
import { HIGHLIGHT_COLORS, type HighlightColor } from './useBookStorage';
import { TranslationPanel } from './TranslationPanel';

export interface SelectionContext {
  text: string;
  /** Present for EPUB selections. */
  cfi?: string;
  /** Present for PDF selections. */
  page?: number;
}

interface SelectionActionSheetProps {
  selection: SelectionContext | null;
  /** Whether to show the highlight color row. Hidden for PDF where
   *  highlight persistence isn't supported. */
  canHighlight: boolean;
  onClose: () => void;

  onLookup: (text: string) => void;
  onAddCard: (text: string) => void;
  /** EPUB highlight: pass back the chosen color — the caller persists. */
  onHighlight: (text: string, cfi: string, color: HighlightColor) => void;
  onBookmark: (selection: SelectionContext) => void;
}

const ACTIONS: readonly { key: string; label: string; help: string }[] = [
  { key: 'lookup',    label: 'Dictionary', help: 'Search this word' },
  { key: 'card',      label: 'Add card',   help: 'Create a flashcard' },
  { key: 'translate', label: 'Translate',  help: 'DeepL translation' },
  { key: 'highlight', label: 'Highlight',  help: 'Save as EPUB highlight' },
  { key: 'bookmark',  label: 'Bookmark',   help: 'Mark this spot' },
] as const;

/**
 * Bottom-sheet action menu shown after a text selection inside the EPUB/PDF
 * viewer. Replaces the old `LookupPopup` and mirrors the web's context-menu
 * action set: Dictionary, Add card, Translate, Highlight, Bookmark.
 *
 * Translation renders *inside* the sheet (via `TranslationPanel`) so the
 * user can still reach other actions without dismissing the result.
 */
export function SelectionActionSheet({
  selection,
  canHighlight,
  onClose,
  onLookup,
  onAddCard,
  onHighlight,
  onBookmark,
}: SelectionActionSheetProps) {
  const styles = useThemedStyles(createStyles);
  const c = useColors();
  const [translating, setTranslating] = useState(false);
  const [showColors,  setShowColors]  = useState(false);

  const visible = !!selection;

  // Reset inline panels when the sheet is dismissed.
  useEffect(() => {
    if (!visible) {
      setTranslating(false);
      setShowColors(false);
    }
  }, [visible]);

  const close = () => {
    setTranslating(false);
    setShowColors(false);
    onClose();
  };

  const handleAction = (key: string) => {
    if (!selection) return;
    const { text, cfi } = selection;
    switch (key) {
      case 'lookup':
        onLookup(text);
        close();
        break;
      case 'card':
        onAddCard(text);
        close();
        break;
      case 'translate':
        setTranslating(true);
        break;
      case 'highlight':
        if (cfi) setShowColors(true);
        break;
      case 'bookmark':
        onBookmark(selection);
        close();
        break;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grab} pointerEvents="none" />

          <View style={styles.header}>
            <Text style={styles.headerText} numberOfLines={2}>
              {selection?.text ?? ''}
            </Text>
            <Pressable onPress={close} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.actionRow}>
              {ACTIONS.filter((a) => canHighlight || a.key !== 'highlight').map((a) => (
                <ActionButton
                  key={a.key}
                  label={a.label}
                  help={a.help}
                  onPress={() => handleAction(a.key)}
                  styles={styles}
                  rippleColor={c.border}
                />
              ))}
            </View>

            {showColors && selection?.cfi ? (
              <ColorPicker
                onPick={(color) => {
                  onHighlight(selection.text, selection.cfi!, color);
                  close();
                }}
                onCancel={() => setShowColors(false)}
                styles={styles}
              />
            ) : null}

            {translating && selection ? (
              <TranslationPanel
                text={selection.text}
                onClose={() => setTranslating(false)}
              />
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type Styles = ReturnType<typeof createStyles>;

function ActionButton({ label, help, onPress, styles, rippleColor }: { label: string; help: string; onPress: () => void; styles: Styles; rippleColor: string }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionHelp}>{help}</Text>
    </Pressable>
  );
}

function ColorPicker({ onPick, onCancel, styles }: { onPick: (c: HighlightColor) => void; onCancel: () => void; styles: Styles }) {
  return (
    <View style={styles.colorRow}>
      <Text style={styles.colorLabel}>Color</Text>
      <View style={styles.swatches}>
        {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => (
          <Pressable
            key={color}
            onPress={() => onPick(color)}
            style={({ pressed }) => [
              styles.swatch,
              { backgroundColor: HIGHLIGHT_COLORS[color] },
              pressed && { opacity: 0.7 },
            ]}
          />
        ))}
      </View>
      <Pressable onPress={onCancel} hitSlop={8}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: c.bgBase,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  grab: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  headerText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: c.textPrimary,
    marginRight: spacing.sm,
  },
  close: {
    fontSize: fontSize.lg,
    color: c.textSecondary,
    paddingHorizontal: spacing.sm,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: c.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  actionBtnPressed: {
    backgroundColor: c.accentSoft,
    borderColor: c.accent,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: c.textPrimary,
  },
  actionHelp: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  colorLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swatches: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  cancelText: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
});
