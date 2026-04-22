import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/lib/i18n/I18nContext';
import { fontSize } from '@/theme/tokens';

export type SelectionAction = 'define' | 'flashcard' | 'highlight' | 'copy';

type Props = {
  pageX: number;
  pageY: number;
  onAction: (action: SelectionAction) => void;
};

const MENU_WIDTH = 260;
const MENU_HEIGHT = 64;
const VERTICAL_OFFSET = 36;

export function SelectionPopover({ pageX, pageY, onAction }: Props) {
  const t = useT();

  const placeBelow = pageY < MENU_HEIGHT + VERTICAL_OFFSET + 20;
  const top = placeBelow ? pageY + VERTICAL_OFFSET : pageY - MENU_HEIGHT - VERTICAL_OFFSET / 2;
  const left = Math.max(12, pageX - MENU_WIDTH / 2);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.menu, { top, left, width: MENU_WIDTH }]}>
        <Row icon="🔍" label={t('reader.define')} onPress={() => onAction('define')} />
        <Row icon="＋" label={t('reader.flashcard')} onPress={() => onAction('flashcard')} />
        <Row icon="✎" label={t('reader.highlight')} onPress={() => onAction('highlight')} />
        <Row icon="⎘" label={t('reader.copy')} onPress={() => onAction('copy')} />
      </View>
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.cell} hitSlop={4}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    backgroundColor: 'rgba(26,25,24,0.95)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 54,
    gap: 2,
  },
  icon: { fontSize: 15, color: '#fff' },
  label: { fontSize: fontSize.xs - 1, fontWeight: '500', color: '#fff' },
});
