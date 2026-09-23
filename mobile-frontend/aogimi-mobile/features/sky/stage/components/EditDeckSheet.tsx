import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, TextField } from '@/shared/components';
import { usePalette, spacing, type, type Palette } from '@/theme';
import { useT } from '@/lib/i18n/I18nContext';
import { updateDeckLocal, MAX_DECK_NAME } from '../lib';
import type { LocalDeck } from '../types';

/**
 * Rename a deck — the menu's `Edit deck` row. One field, because a deck's name
 * is the only thing about it the owner asked to edit here; the description
 * stays as it is.
 *
 * Local-first like every other write: `updateDeckLocal` marks the row pending
 * and pushes in the background, and the caller re-reads the store.
 */
export function EditDeckSheet({
  deck,
  onDismiss,
  onSaved,
}: {
  deck: LocalDeck | null;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Seed from the deck each time one is handed in, so reopening for a different
  // deck never shows the previous one's draft.
  useEffect(() => {
    if (deck) setName(deck.name);
  }, [deck]);

  const trimmed = name.trim();
  const canSave = deck !== null && trimmed.length > 0 && !saving;

  const save = async () => {
    if (!deck || !canSave) return;
    if (trimmed === deck.name) {
      onDismiss();
      return;
    }
    setSaving(true);
    try {
      await updateDeckLocal(deck.id, { name: trimmed });
      onSaved();
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={deck !== null} onDismiss={onDismiss} heightRatio={0.42}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <View style={s.host}>
          <Text style={s.title}>{t('sky.editDeck')}</Text>
          <TextField
            label={t('sky.deckName')}
            value={name}
            onChangeText={setName}
            placeholder={t('sky.deckNamePlaceholder')}
            japanese
            autoFocus
            maxLength={MAX_DECK_NAME}
            editable={!saving}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
          <View style={s.actions}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={onDismiss}
              disabled={saving}
              style={s.flex}
            />
            <Button
              label={t('common.save')}
              onPress={() => void save()}
              loading={saving}
              disabled={!canSave}
              style={s.flex}
            />
          </View>
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
        actions: { flexDirection: 'row', gap: spacing.sm + 2 },
      }),
    [p],
  );
}
