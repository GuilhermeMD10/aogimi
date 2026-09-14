import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
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

// Icons rather than words. The three actions are short, frequent and always
// the same three, so a glyph is quicker to hit than a word is to read -- and
// it keeps the menu narrow enough to sit over a line of text without covering
// the sentence the reader is looking at. The word survives as the
// accessibility label, which is the place that actually needs it.
type Item = {
  key: NativeMenuKey;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};
const ITEMS: Item[] = [
  { key: 'dict', label: 'Dictionary', icon: 'book-open' },
  { key: 'card', label: 'Add card', icon: 'plus-square' },
  { key: 'copy', label: 'Copy', icon: 'copy' },
];

const ICON_SIZE = 20;

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
      {/* Two views, because one cannot do both jobs: overflow:hidden sets
          masksToBounds on iOS, which clips the view's own shadow along with
          its children. The outer view casts, the inner view clips. */}
      <View
        onLayout={onLayout}
        style={[
          styles.shadow,
          pos
            ? { top: pos.top, left: pos.left, opacity: 1 }
            : { top: 0, left: 0, opacity: 0 },
        ]}
      >
        <View style={styles.menu}>
          {ITEMS.map((item, idx) => (
            <View key={item.key} style={styles.itemWrap}>
              {idx > 0 && <View style={styles.divider} />}
              <Touchable
                minTarget={false}
                hitSlop={8}
                onPress={() => onAction(item.key)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={styles.item}
              >
                <Feather name={item.icon} size={ICON_SIZE} color={palette.btnInk} />
              </Touchable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A dark panel with light glyphs, not the pale popover this used to be.
  //
  // It is the one piece of chrome that has to land ON the page, over whatever
  // the book is made of, and the page is light, sepia or dark depending on the
  // reader's theme. A near-white panel had almost nothing to separate it from
  // a light page. btn/btnInk is the palette's filled-primary pair -- its
  // highest-contrast combination -- so the menu reads on all three.
  // Casts only. No background and no mask, so the shadow is free to draw.
  shadow: {
    position: 'absolute',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  // Clips only.
  menu: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: palette.btn,
    borderRadius: 14,
    overflow: 'hidden',
  },
  itemWrap: { flexDirection: 'row', alignItems: 'stretch' },
  divider: {
    width: StyleSheet.hairlineWidth,
    // Reads as a seam on the dark face; paperBd would vanish into it.
    backgroundColor: palette.soft,
  },
  item: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
