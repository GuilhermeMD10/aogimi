import { useCallback, useEffect, useState } from 'react';
import { useFlashcardForm } from '../hooks/useFlashcardForm';
import {
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
import { Button } from '@/components/ui/Button';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { createCardLocal } from '../utils/cardPush';
import { createDeckLocal } from '../utils/deckPush';
import { getAllDecks } from '../utils/deckLocalState';
import type { LocalDeck } from '../types';
import { useAuth } from '@/lib/auth/AuthContext';

export type FlashcardPrefill = {
  front: string;
  reading: string;
  back: string;
  /** Auto-filled context sentence (e.g. dict's first example). The
   *  drawer doesn't currently expose a field for the user to edit it
   *  inline; it's a pass-through from the caller. */
  contextSentence?: string;
};

type Props = {
  visible: boolean;
  prefill: FlashcardPrefill | null;
  onDismiss: () => void;
  onSaved?: () => void;
  /** If provided, skip the deck picker and save straight to this deck. */
  lockedDeckId?: string;
};

export function FlashcardDrawer({ visible, prefill, onDismiss, onSaved, lockedDeckId }: Props) {
  const c = useColors();
  const t = useT();
  const { user } = useAuth();

  const userId = user?.id;
  const [decks, setDecks] = useState<LocalDeck[]>([]);

  // Pull decks from the local store. Local-first means the picker
  // reflects pending-create decks too — the user just made one offline
  // and wants to drop cards into it. Refresh whenever the drawer
  // opens so a deck created elsewhere in the app shows up.
  useEffect(() => {
    if (!visible || userId == null || lockedDeckId) return;
    let cancelled = false;
    void (async () => {
      const list = await getAllDecks();
      if (cancelled) return;
      const visible = list.filter((d) => d.pendingOp !== 'delete');
      setDecks(visible);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId, lockedDeckId]);

  const [deckId, setDeckId] = useState<string | null>(null);
  const form = useFlashcardForm();
  const { front, setFront, reading, setReading, back, setBack, newDeckName, setNewDeckName, reset: resetForm } = form;
  const [creatingNewDeck, setCreatingNewDeck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = useCallback(() => {
    resetForm();
    setCreatingNewDeck(false);
    setError(null);
    onDismiss();
  }, [onDismiss, resetForm]);

  // React to a fresh deck list: pre-select the first deck (if none
  // chosen) and toggle into "create new deck" mode if the list is empty.
  useEffect(() => {
    if (decks.length > 0 && !deckId) setDeckId(decks[0]!.id);
    if (visible) setCreatingNewDeck(decks.length === 0);
  }, [decks, deckId, visible]);

  useEffect(() => {
    if (!visible || !prefill) return;
    setFront(prefill.front);
    setReading(prefill.reading);
    setBack(prefill.back);
    setError(null);
  }, [visible, prefill, setFront, setReading, setBack]);

  const canSave =
    front.trim().length > 0 &&
    back.trim().length > 0 &&
    (lockedDeckId
      ? true
      : creatingNewDeck
        ? newDeckName.trim().length > 0
        : Boolean(deckId)) &&
    !saving;

  async function handleSave() {
    if (!canSave || !user) return;
    setError(null);
    setSaving(true);
    try {
      let targetDeckId = lockedDeckId ?? deckId;
      if (!lockedDeckId && creatingNewDeck) {
        // Local-first: deck appears in the local store immediately,
        // and pushes to backend in the background.
        const created = await createDeckLocal(user.id, newDeckName.trim(), '');
        targetDeckId = created.id;
      }
      if (!targetDeckId) throw new Error('No deck selected');
      await createCardLocal(targetDeckId, {
        front: front.trim(),
        reading: reading.trim(),
        back: back.trim(),
        contextSentence: prefill?.contextSentence ?? '',
      });
      onSaved?.();
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onDismiss={resetAndClose} heightRatio={0.75}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.fg }]}>{t('dict.addFlashcard')}</Text>
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
              placeholder="言葉"
              placeholderTextColor={c.fgSubtle}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Reading">
            <TextInput
              value={reading}
              onChangeText={setReading}
              style={[styles.input, styles.inputJp, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
              placeholder="ことば"
              placeholderTextColor={c.fgSubtle}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Back (meaning)">
            <TextInput
              value={back}
              onChangeText={setBack}
              style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border, minHeight: 72 }]}
              placeholder="word; language; speech"
              placeholderTextColor={c.fgSubtle}
              multiline
            />
          </Field>

          {!lockedDeckId && <Field label="Deck">
            {decks.length > 0 && !creatingNewDeck && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deckRow}>
                {decks.map((d) => {
                  const selected = d.id === deckId;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => setDeckId(d.id)}
                      style={[
                        styles.deckChip,
                        {
                          backgroundColor: selected ? c.fg : c.bgSunken,
                          borderColor: selected ? c.fg : c.border,
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? c.accentFg : c.fg, fontSize: fontSize.sm, fontWeight: '500' }}>
                        {d.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setCreatingNewDeck(true)}
                  style={[styles.deckChip, { borderColor: c.border }]}
                >
                  <Text style={{ color: c.fgMuted, fontSize: fontSize.sm, fontWeight: '500' }}>+ New</Text>
                </Pressable>
              </ScrollView>
            )}

            {creatingNewDeck && (
              <View style={{ gap: spacing.sm }}>
                <TextInput
                  value={newDeckName}
                  onChangeText={setNewDeckName}
                  style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
                  placeholder="Deck name"
                  placeholderTextColor={c.fgSubtle}
                />
                {decks.length > 0 && (
                  <Pressable onPress={() => setCreatingNewDeck(false)}>
                    <Text style={{ color: c.fgMuted, fontSize: fontSize.sm }}>
                      Pick an existing deck
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </Field>}

          {error && <Text style={[styles.error, { color: c.error }]}>{error}</Text>}
        </ScrollView>

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
  scroll: { paddingHorizontal: 22, paddingBottom: 24, gap: spacing.md },
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
  },
  inputJp: { fontFamily: fontFamily.jp },
  deckRow: { gap: 8, paddingVertical: 2 },
  deckChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  error: { fontSize: fontSize.sm },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});
