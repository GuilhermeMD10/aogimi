import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontSize, radius } from '@/theme/tokens';
import type { Preset } from '../types';

const PRESETS: Preset[] = ['easy', 'default', 'hard', 'production'];

type Props = {
  value: Preset;
  onChange: (preset: Preset) => void;
};

// Segmented control over the 4 presets. Selecting a preset overwrites
// every toggle to the preset's canonical layout — see PRESETS in
// utils/displayPrefs.ts. Manual toggles after selecting don't change
// which preset shows as selected here.
export function PresetPicker({ value, onChange }: Props) {
  const c = useColors();
  const t = useT();
  return (
    <View style={[styles.row, { backgroundColor: c.bgSunken, borderColor: c.border }]}>
      {PRESETS.map((p) => {
        const selected = p === value;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            style={[
              styles.cell,
              selected && { backgroundColor: c.bgElev, borderColor: c.borderStrong },
              !selected && { borderColor: 'transparent' },
            ]}
            hitSlop={4}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? c.fg : c.fgMuted, fontWeight: selected ? '600' : '500' },
              ]}
            >
              {t(`studyDisplay.preset.${p}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 2,
  },
  cell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    letterSpacing: -0.1,
  },
});
