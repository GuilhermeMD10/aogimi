import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { createDeck } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DeckRecord } from '@/lib/types';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (deck: DeckRecord) => void;
};

export function NewDeckSheet({ visible, onDismiss, onCreated }: Props) {
  const c = useColors();
  const t = useT();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    try {
      const deck = await createDeck(user.id, name.trim(), description.trim());
      setName('');
      setDescription('');
      onCreated(deck);
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    setName('');
    setDescription('');
    setError(null);
    onDismiss();
  }

  return (
    <BottomSheet visible={visible} onDismiss={handleDismiss} heightRatio={0.55}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.fg }]}>{t('decks.new')}</Text>
        </View>

        <View style={styles.body}>
          <Field label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
              placeholder="Kokoro vocabulary"
              placeholderTextColor={c.fgSubtle}
            />
          </Field>

          <Field label="Description (optional)">
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border, minHeight: 80 }]}
              placeholder="Notes about this deck"
              placeholderTextColor={c.fgSubtle}
              multiline
            />
          </Field>

          {error && <Text style={{ color: c.error, fontSize: fontSize.sm }}>{error}</Text>}
        </View>

        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <Button label={t('common.save')} onPress={handleSave} loading={saving} disabled={!canSave} full />
        </View>
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
  header: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  body: { paddingHorizontal: 22, gap: spacing.md, flex: 1 },
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
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});
