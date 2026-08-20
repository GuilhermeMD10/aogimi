import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import { palette } from '@/theme/tokens';
import { computeMenuPosition, type SelectionRect, type Viewport } from './menuPosition';

export type NativeMenuKey = 'dict' | 'card' | 'copy';

type Props = {
  selectionRect: SelectionRect;
  viewport: Viewport;
  onAction: (key: NativeMenuKey) => void;
  onDismiss: () => void;
};

type Item = { key: NativeMenuKey; label: string };
const ITEMS: Item[] = [
  { key: 'dict', label: 'Dict' },
  { key: 'card', label: 'Card' },
  { key: 'copy', label: 'Copy' },
];

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
      <PressableBackdrop onPress={onDismiss} style={StyleSheet.absoluteFill} />
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
            <Touchable
              minTarget={false}
              hitSlop={6}
              onPress={() => onAction(item.key)}
              style={styles.item}
            >
              <Text style={styles.label}>{item.label}</Text>
            </Touchable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Light panel, black labels, token borders — like every other popover.
  menu: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: palette.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.paperBd,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemWrap: { flexDirection: 'row', alignItems: 'stretch' },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.paperBd,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
