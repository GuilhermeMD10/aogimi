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
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { deleteCardLocal, updateCardLocal } from '../lib/cardPush';
import { cardBack } from '../lib/cardBack';
import {
  MAX_CARD_BACK,
  MAX_CARD_FRONT,
  MAX_CARD_MEANING,
  MAX_CARD_MEANINGS,
  MAX_CARD_READING,
} from '../lib/limits';
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
  const [meanings, setMeanings] = useState<string[]>([]);
  const [back, setBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * **Structured or legacy, never both.**
   *
   * A card added since migration 026 carries its glosses in `meanings`, and its
   * `back` is a *rendering* of them — so that card is edited through meaning
   * slots and `back` is re-derived on save. A card from before it has
   * `meanings: []` and its glosses live inside the `back` blob, so that one
   * keeps the free-text field.
   *
   * The tempting third option — parse the blob into slots — is deliberately not
   * taken. Hand-made and pre-026 mobile-made cards follow no convention, so a
   * parser mangles them, and it would do so silently on a screen whose whole
   * job is not losing the user's words.
   */
  const isStructured = (card?.meanings.length ?? 0) > 0;

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setReading(card.reading);
      setMeanings(padSlots(card.meanings));
      setBack(card.back);
      setError(null);
    }
  }, [card]);

  const canSave =
    !!card &&
    front.trim().length > 0 &&
    (isStructured ? meanings.some((m) => m.trim().length > 0) : back.trim().length > 0) &&
    !saving;

  function setMeaningAt(index: number, value: string) {
    setMeanings((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSave() {
    if (!card || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const trimmedFront = front.trim();
      const trimmedReading = reading.trim();
      const updated = await updateCardLocal(
        card.id,
        isStructured
          ? (() => {
              const nextMeanings = meanings.map((m) => m.trim()).filter((m) => m.length > 0);
              return {
                front: trimmedFront,
                reading: trimmedReading,
                meanings: nextMeanings,
                // Re-rendered from the edited fields so the blob and the
                // structured glosses can't disagree.
                back: cardBack({
                  front: trimmedFront,
                  reading: trimmedReading,
                  meanings: nextMeanings,
                  jlptLevel: card.jlpt_level,
                }),
              };
            })()
          : // Legacy card: `back` is the only place its glosses exist, so it
            // stays the editable surface and `meanings` is left alone at [].
            { front: trimmedFront, reading: trimmedReading, back: back.trim() },
      );
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
              maxLength={MAX_CARD_FRONT}
              style={[styles.input, styles.inputJp, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Reading">
            <TextInput
              value={reading}
              onChangeText={setReading}
              maxLength={MAX_CARD_READING}
              style={[styles.input, styles.inputJp, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
              autoCapitalize="none"
            />
          </Field>
          {isStructured ? (
            <Field label="Meanings">
              <View style={{ gap: 8 }}>
                {meanings.map((m, i) => (
                  <TextInput
                    key={i}
                    value={m}
                    onChangeText={(v) => setMeaningAt(i, v)}
                    maxLength={MAX_CARD_MEANING}
                    style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border }]}
                    placeholder={i === 0 ? 'word' : 'optional'}
                    placeholderTextColor={c.fgSubtle}
                  />
                ))}
              </View>
            </Field>
          ) : (
            <Field label="Back (meaning)">
              <TextInput
                value={back}
                onChangeText={setBack}
                maxLength={MAX_CARD_BACK}
                style={[styles.input, { color: c.fg, backgroundColor: c.bgSunken, borderColor: c.border, minHeight: 80 }]}
                multiline
              />
            </Field>
          )}

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

/** Pads a card's stored glosses out to a fixed slot count, so the input count
 *  is stable regardless of how many the card actually has. */
function padSlots(meanings: string[]): string[] {
  const slots = Array<string>(MAX_CARD_MEANINGS).fill('');
  meanings.slice(0, MAX_CARD_MEANINGS).forEach((m, i) => {
    slots[i] = m;
  });
  return slots;
}
