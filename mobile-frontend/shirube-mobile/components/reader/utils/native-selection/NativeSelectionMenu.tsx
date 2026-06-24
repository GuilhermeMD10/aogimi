import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { computeMenuPosition, type SelectionRect, type Viewport } from './menuPosition';
import { DEEPL_ENABLED } from '@/lib/features/deepl';

export type NativeMenuKey = 'dict' | 'card' | 'deepl' | 'highlight' | 'copy';

type Props = {
  selectionRect: SelectionRect;
  viewport: Viewport;
  onAction: (key: NativeMenuKey) => void;
  onDismiss: () => void;
};

// Highlight is rendered as a small colored swatch instead of a text label
// to save horizontal space — the menu is rendered over text and needs to
// stay narrow. Underlying picker behavior is intentionally untouched.
type Item =
  | { key: NativeMenuKey; kind: 'text'; label: string }
  | { key: NativeMenuKey; kind: 'swatch'; color: string };
// DeepL entry filtered out when the feature is disabled (see
// `lib/features/deepl.ts`). Definition kept inline so re-enabling
// only requires flipping the flag.
const ALL_ITEMS: Item[] = [
  { key: 'dict', kind: 'text', label: 'Dict' },
  { key: 'card', kind: 'text', label: 'Card' },
  { key: 'deepl', kind: 'text', label: 'DeepL' },
  { key: 'highlight', kind: 'swatch', color: '#5B9BD5' },
  { key: 'copy', kind: 'text', label: 'Copy' },
];
const ITEMS: Item[] = DEEPL_ENABLED
  ? ALL_ITEMS
  : ALL_ITEMS.filter((i) => i.key !== 'deepl');

// Replaces the OS selection bubble. Positioned above the selection by
// default; flips below when there's no room at the top. Tap outside to
// dismiss; selection itself is owned upstream so the OS handles stay put.
export function NativeSelectionMenu({ selectionRect, viewport, onAction, onDismiss }: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (size && size.width === width && size.height === height) return;
    setSize({ width, height });
  };

  const pos = size
    ? computeMenuPosition(selectionRect, size, viewport)
    : null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill} />
      <View
        onLayout={onLayout}
        style={[
          styles.menu,
          pos
            ? { top: pos.top, left: pos.left, opacity: 1 }
            : { top: 0, left: 0, opacity: 0 },
        ]}
      >
        {ITEMS.map((item, idx) => (
          <View key={item.key} style={styles.itemWrap}>
            {idx > 0 && <View style={styles.divider} />}
            <Pressable
              onPress={() => onAction(item.key)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              hitSlop={4}
            >
              {item.kind === 'text' ? (
                <Text style={styles.label}>{item.label}</Text>
              ) : (
                <View style={[styles.swatch, { backgroundColor: item.color }]} />
              )}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(26,25,24,0.96)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  itemWrap: { flexDirection: 'row', alignItems: 'stretch' },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    // Subtle outline so the swatch reads on the dark menu background.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
