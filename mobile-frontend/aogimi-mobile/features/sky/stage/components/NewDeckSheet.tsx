import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '@/shared/components';
import { usePalette, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { createDeckLocal, MAX_DECK_DESCRIPTION, MAX_DECK_NAME } from '../lib';
import type { LocalDeck } from '../types';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (deck: LocalDeck) => void;
};

/**
 * Create a deck. No handoff draws this sheet, so it keeps its layout — a name,
 * an optional description, save — and takes the new material (D8).
 *
 * Local-first: the deck appears immediately under a client-side UUID and the
 * background push inside `createDeckLocal` flips it to synced, or leaves it
 * pending for the next sync.
 */
export function NewDeckSheet({ visible, onDismiss, onCreated }: Props) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  function reset() {
    setName('');
    setDescription('');
    setError(null);
  }

  async function handleSave() {
    if (!canSave || !user) return;
    setSaving(true);
    setError(null);
    try {
      const deck = await createDeckLocal(user.id, name.trim(), description.trim());
      reset();
      onCreated(deck);
      onDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function handleDismiss() {
    reset();
    onDismiss();
  }

  return (
    <BottomSheet visible={visible} onDismiss={handleDismiss} heightRatio={0.55}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.host}>
          <Text style={s.title}>{t('decks.new')}</Text>

          <TextField
            label={t('sky.deckName')}
            value={name}
            onChangeText={setName}
            placeholder={t('sky.deckNamePlaceholder')}
            japanese
            maxLength={MAX_DECK_NAME}
            editable={!saving}
            returnKeyType="next"
          />
          <TextField
            label={t('sky.deckDescription')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('sky.deckDescriptionPlaceholder')}
            multiline
            maxLength={MAX_DECK_DESCRIPTION}
            editable={!saving}
          />

          {error && <Text style={s.error}>{error}</Text>}

          <Button label={t('common.save')} onPress={() => void handleSave()} loading={saving} disabled={!canSave} full />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        flex: { flex: 1 },
        host: { paddingHorizontal: spacing.screenX, gap: spacing.lg },
        title: { ...type.headlineMd, color: p.ink },
        error: { ...type.bodySm, color: p.danger },
      }),
    [p],
  );
}
