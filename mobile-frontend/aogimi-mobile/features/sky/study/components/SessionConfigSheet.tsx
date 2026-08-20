import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import type { StudyMode } from '../types';

// Per-deck session config. The user picks one mode + a session size;
// "Hardest across all decks" is intentionally excluded — it's a
// cross-deck entry point, not a deck-scoped setting.
const PER_DECK_MODES: StudyMode[] = [
  'hardest',
  'random',
  'oldest_first',
  'oldest_only',
  'newest_only',
  'by_creation',
];

const MIN_SIZE = 1;
const MAX_SIZE = 200;

type Props = {
  visible: boolean;
  initialMode: StudyMode;
  initialSize: number;
  onDismiss: () => void;
  onSave: (mode: StudyMode, size: number) => void;
};

export function SessionConfigSheet({
  visible,
  initialMode,
  initialSize,
  onDismiss,
  onSave,
}: Props) {
  const c = useColors();
  const t = useT();

  const [mode, setMode] = useState<StudyMode>(initialMode);
  const [sizeText, setSizeText] = useState(String(initialSize));

  // Reset whenever the sheet opens — the prior session might've been
  // for a different deck or had unsaved tweaks.
  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setSizeText(String(initialSize));
    }
  }, [visible, initialMode, initialSize]);

  function handleSave() {
    const parsed = parseInt(sizeText, 10);
    const safe =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed))
        : initialSize;
    onSave(mode, safe);
  }

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.7}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Touchable
            minTarget={false}
            hitSlop={10} onPress={onDismiss}>
            <Text style={[styles.headerAction, { color: c.fgMuted }]}>{t('common.cancel')}</Text>
          </Touchable>
          <Text style={[styles.headerTitle, { color: c.fg }]}>
            {t('sessionConfig.title')}
          </Text>
          <Touchable
            minTarget={false}
            hitSlop={10} onPress={handleSave}>
            <Text style={[styles.headerAction, { color: c.fg, fontWeight: '600' }]}>
              {t('common.save')}
            </Text>
          </Touchable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Section label={t('sessionConfig.mode')} c={c}>
            {PER_DECK_MODES.map((m) => (
              <ModeRow
                key={m}
                label={t(`study.mode.${m}`)}
                selected={mode === m}
                onPress={() => setMode(m)}
                c={c}
              />
            ))}
          </Section>

          <Section label={t('sessionConfig.size')} c={c}>
            <TextInput
              value={sizeText}
              onChangeText={setSizeText}
              keyboardType="number-pad"
              maxLength={3}
              style={[
                styles.input,
                {
                  color: c.fg,
                  backgroundColor: c.bgSunken,
                  borderColor: c.border,
                  fontFamily: fontFamily.ui,
                },
              ]}
            />
            <Text style={[styles.hint, { color: c.fgSubtle }]}>
              {t('sessionConfig.sizeHint', { min: MIN_SIZE, max: MAX_SIZE })}
            </Text>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function Section({
  label,
  c,
  children,
}: {
  label: string;
  c: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.fgMuted }]}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ModeRow({
  label,
  selected,
  onPress,
  c,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <Touchable
      minTarget={false}
      onPress={onPress}
      style={[
        styles.modeRow,
        {
          backgroundColor: selected ? c.bgElev : 'transparent',
          borderColor: selected ? c.borderStrong : c.border,
        },
      ]}
    >
      <View
        style={[
          styles.radio,
          { borderColor: selected ? c.fg : c.border },
        ]}
      >
        {selected && <View style={[styles.radioDot, { backgroundColor: c.fg }]} />}
      </View>
      <Text style={[styles.modeLabel, { color: c.fg }]}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: { fontSize: fontSize.md },
  headerTitle: { fontSize: fontSize.md, fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: spacing.xl, gap: spacing.lg },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  sectionBody: { gap: 6 },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeLabel: { fontSize: fontSize.md, flex: 1 },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.md,
    textAlign: 'center',
    width: 100,
  },
  hint: {
    fontSize: fontSize.xs,
    paddingHorizontal: 2,
    marginTop: 4,
  },
});
