import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Button } from '@/shared/components/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { KAMON_SET } from '../lib/kamon';

type Props = {
  visible: boolean;
  current: number;
  onDismiss: () => void;
  onSelect: (index: number) => void;
};

export function AvatarPickerSheet({ visible, current, onDismiss, onSelect }: Props) {
  const c = useColors();
  const t = useT();
  const [selected, setSelected] = useState(current);

  useEffect(() => {
    if (visible) setSelected(current);
  }, [visible, current]);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.75}>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: c.fgMuted }]}>Choose avatar</Text>
        <Text style={[styles.title, { color: c.fg }]}>Kamon</Text>
      </View>

      <View style={styles.grid}>
        {KAMON_SET.map((k, i) => {
          const active = selected === i;
          return (
            <Touchable
              minTarget={false}
              key={k.char}
              onPress={() => setSelected(i)}
              style={[
                styles.cell,
                {
                  borderColor: active ? c.accent : c.border,
                  backgroundColor: c.bgSunken,
                  shadowColor: active ? c.accent : 'transparent',
                },
              ]}
            >
              <Text style={[styles.glyph, { color: c.fg }]}>{k.char}</Text>
            </Touchable>
          );
        })}
      </View>

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <Button
          label={t('common.save')}
          onPress={() => {
            onSelect(selected);
            onDismiss();
          }}
          full
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: spacing.md },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: fontSize.lg, fontWeight: '600', marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    flex: 1,
  },
  cell: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontFamily: fontFamily.jp, fontSize: 28, fontWeight: '500' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});
