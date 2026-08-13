import { Pressable, StyleSheet, View } from 'react-native';
import { palette } from '@/theme/tokens';
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from '../lib/readerStorage';

type Props = {
  pageX: number;
  pageY: number;
  /** color of an existing highlight at this cfi, if any */
  existingColor?: HighlightColor | null;
  onPick: (color: HighlightColor) => void;
  onClear: () => void;
  onDismiss: () => void;
};

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue'];

const MENU_WIDTH = 168;
const MENU_HEIGHT = 48;
const VERTICAL_OFFSET = 32;

export function HighlightPicker({
  pageX,
  pageY,
  existingColor,
  onPick,
  onClear,
  onDismiss,
}: Props) {
  const placeBelow = pageY < MENU_HEIGHT + VERTICAL_OFFSET + 20;
  const top = placeBelow
    ? pageY + VERTICAL_OFFSET
    : pageY - MENU_HEIGHT - VERTICAL_OFFSET / 2;
  const left = Math.max(12, pageX - MENU_WIDTH / 2);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        onPress={onDismiss}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.menu, { top, left, width: MENU_WIDTH }]}>
        {COLORS.map((color) => {
          const active = existingColor === color;
          return (
            <Pressable
              key={color}
              onPress={() => onPick(color)}
              style={[
                styles.swatch,
                {
                  backgroundColor: HIGHLIGHT_COLORS[color],
                  // The "this one is applied" ring. Ink, not white — the menu is
                  // a light panel now, so a white ring on a pale yellow swatch
                  // was invisible.
                  borderColor: active ? palette.ink : 'transparent',
                },
              ]}
              hitSlop={6}
            />
          );
        })}
        {existingColor && (
          <Pressable onPress={onClear} style={styles.clear} hitSlop={6}>
            <View style={styles.clearLine} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    // Was a near-black slab with white detailing. Light panel + ink detailing
    // under the 2026-08-11 reset, like every other popover.
    backgroundColor: palette.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.paperBd,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
  },
  clear: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearLine: {
    width: 16,
    height: 2,
    backgroundColor: palette.ink,
    borderRadius: 1,
  },
});
