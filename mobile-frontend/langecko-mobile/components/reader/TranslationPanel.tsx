import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { translateText } from '@/lib/api';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';

interface TranslationPanelProps {
  text: string;
  /** DeepL target language code, defaults to EN. Accepts codes from
   *  ALLOWED_TARGETS on the backend (e.g. "PT-BR"). */
  target?: string;
  onClose: () => void;
}

/**
 * Inline DeepL translation result. Rendered inside the SelectionActionSheet
 * when the user picks "Translate" — the sheet stays mounted so the user can
 * also still tap Lookup / Add Card without losing the translation result.
 *
 * Upstream translation goes through the Express backend so the API key
 * never touches the client. See `backend/src/routes/translate.js`.
 */
export function TranslationPanel({ text, target, onClose }: TranslationPanelProps) {
  const styles = useThemedStyles(createStyles);
  const c = useColors();

  const { data, loading, error } = useFetchWithAbort(
    (signal) => translateText(text, { target, signal }),
    [text, target],
    { enabled: !!text },
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Translation{data?.detectedLanguage ? ` · ${data.detectedLanguage} → ${(target ?? 'EN').toUpperCase()}` : ''}
        </Text>
        <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.source} numberOfLines={3}>{text}</Text>

      <View style={styles.divider} />

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={c.textPrimary} />
          <Text style={styles.loadingLabel}>Translating…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <Text style={styles.translation}>{data.translatedText}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  root: {
    backgroundColor: c.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: c.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  close: {
    fontSize: fontSize.md,
    color: c.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  source: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingLabel: {
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  error: {
    fontSize: fontSize.sm,
    color: c.error,
  },
  translation: {
    fontSize: fontSize.md,
    color: c.textPrimary,
    lineHeight: fontSize.md * 1.45,
  },
});
