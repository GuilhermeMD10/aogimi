import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';

export type ToolbarAction =
  | 'prev'
  | 'next'
  | 'toc'
  | 'annotations'
  | 'bookmark'
  | 'typography';

type Props = {
  active?: ToolbarAction | null;
  onAction: (action: ToolbarAction) => void;
};

const ITEMS: { key: ToolbarAction; label: string }[] = [
  { key: 'prev', label: '‹' },
  { key: 'next', label: '›' },
  { key: 'toc', label: '☰' },
  { key: 'annotations', label: '★' },
  { key: 'bookmark', label: '+' },
  { key: 'typography', label: 'Aa' },
];

export function ReaderToolbar({ active, onAction }: Props) {
  const c = useColors();
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View
        style={[
          styles.bar,
          { backgroundColor: c.bgElev, borderColor: c.borderStrong },
        ]}
      >
        {ITEMS.map((item, i) => {
          const isActive = active === item.key;
          return (
            <View key={item.key} style={styles.cell}>
              <Pressable
                onPress={() => onAction(item.key)}
                style={[
                  styles.btn,
                  isActive && { backgroundColor: c.accentSoft },
                ]}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? c.accent : c.fg },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
              {i < ITEMS.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: c.border }]} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  cell: { flexDirection: 'row', alignItems: 'center' },
  btn: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 16, fontWeight: '500', lineHeight: 18 },
  divider: { width: StyleSheet.hairlineWidth, height: 18, marginHorizontal: 2 },
});
