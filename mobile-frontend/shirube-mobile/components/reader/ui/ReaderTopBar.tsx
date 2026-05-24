import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';

// Minimal top-edge chrome for the reader page. The floating-pill dock at the
// bottom carries the progress, chapter, and bookmark surfaces; the only
// remaining responsibility up here is back-to-library navigation.

type Props = {
  onBack?: () => void;
};

export function ReaderTopBar({ onBack }: Props) {
  const c = useColors();
  return (
    <View pointerEvents="box-none" style={styles.row}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to library"
        hitSlop={14}
        style={[styles.iconBtn, { backgroundColor: c.bgElev, borderColor: c.border }]}
      >
        <Text style={[styles.chevron, { color: c.fg }]}>‹</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chevron: { fontSize: 22, lineHeight: 22, fontWeight: '300' },
});
