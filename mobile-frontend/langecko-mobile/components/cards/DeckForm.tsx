import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';

interface DeckFormValues {
  name: string;
  description: string;
}

interface DeckFormProps {
  /** "Create" for new decks; "Save" for edit flow. */
  submitLabel: string;
  /** Pre-filled values when editing an existing deck. */
  initial?: Partial<DeckFormValues>;
  onSubmit: (values: DeckFormValues) => void;
  onCancel: () => void;
}

/**
 * Shared name + description form used both when creating a new deck and
 * editing an existing one. Kept dumb on purpose — parents own the decision
 * of which mutation to call on submit.
 */
export function DeckForm({ submitLabel, initial, onSubmit, onCancel }: DeckFormProps) {
  const styles = useThemedStyles(createStyles);
  const [name, setName]               = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const canSubmit = name.trim().length > 0;

  const submit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), description: description.trim() });
  }, [canSubmit, name, description, onSubmit]);

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Deck name"
          autoFocus
          returnKeyType="next"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Optional — what's this deck for?"
          multiline
          style={styles.textarea}
        />
      </View>

      <View style={styles.actions}>
        <Button label="Cancel" onPress={onCancel} />
        <Button
          label={submitLabel}
          variant="primary"
          onPress={submit}
          disabled={!canSubmit}
        />
      </View>
    </View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
