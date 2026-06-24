import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { deleteCardLocal, updateCardLocal } from '../utils/cardPush';
import type { LocalCard } from '../types';

type Props = {
  visible: boolean;
  card: LocalCard | null;
  onDismiss: () => void;
  onSaved: (card: LocalCard) => void;
  onDeleted: (cardId: string) => void;
};

export function CardEditSheet({ visible, card, onDismiss, onSaved, onDeleted }: Props) {
  const c = useColors();
  const t = useT();

  const [front, setFront] = useState('');
  const [reading, setReading] = useState('');
  const [back, setBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setReading(card.reading);
      setBack(card.back);
      setError(null);
    }
  }, [card]);

  const canSave =
    !!card &&
    front.trim().length > 0 &&
    back.trim().length > 0 &&
    !saving;

  async function handleSave() {
    if (!card || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCardLocal(card.id, {
        front: front.trim(),
        reading: reading.trim(),
        back: back.trim(),
      });
      if (updated) onSaved(updated);
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!card) return;
    Alert.alert('Delete card?', 'This cannot be undone.', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCardLocal(card.id);
            onDeleted(card.id);
            onDismiss();
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error'));
          }
        },
      },
    ]);
  }

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.75}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Text style={[styles.headerAction, { color: c.fgMuted }]}>{t('common.cancel')}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.fg }]}>Edit card</Text>
          <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8}>
            <Text
              style={[
                styles.headerAction,
                { color: canSave ? c.fg : c.fgSubtle, fontWeight: '600' },
              ]}
            >
              {saving ? '…' : t('common.save')}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Front (JP)">
            <TextInput
              value={front}
              onChangeText={setFront}
              style={[styles.input, styles.inputJp, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Reading">
            <TextInput
              value={reading}
              onChangeText={setReading}
              style={[styles.input, styles.inputJp, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Back (meaning)">
            <TextInput
              value={back}
              onChangeText={setBack}
              style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border, minHeight: 80 }]}
              multiline
            />
          </Field>

          {error && <Text style={{ color: c.error, fontSize: fontSize.sm }}>{error}</Text>}

          <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
            <Text style={[styles.deleteText, { color: c.error }]}>{t('common.delete')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: c.fgMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: { fontSize: fontSize.md, fontWeight: '500' },
  headerTitle: { fontSize: fontSize.md, fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingVertical: spacing.lg, gap: spacing.md },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.md,
    fontFamily: fontFamily.ui,
  },
  inputJp: { fontFamily: fontFamily.jp },
  deleteBtn: { alignSelf: 'center', paddingVertical: 14, marginTop: spacing.md },
  deleteText: { fontSize: fontSize.sm, fontWeight: '500' },
});
