import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { translateText } from '../utils/translateApi';

type State =
  | { kind: 'loading' }
  | { kind: 'success'; translatedText: string; detectedLanguage: string }
  | { kind: 'error'; message: string };

type Props = {
  visible: boolean;
  text: string;
  onDismiss: () => void;
};

export function DeepLPopup({ visible, text, onDismiss }: Props) {
  const c = useColors();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!visible || !text) return;
    const controller = new AbortController();
    setState({ kind: 'loading' });
    translateText(text, { signal: controller.signal })
      .then((res) =>
        setState({
          kind: 'success',
          translatedText: res.translatedText,
          detectedLanguage: res.detectedLanguage,
        }),
      )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Translation failed.',
        });
      });
    return () => controller.abort();
  }, [visible, text]);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} heightRatio={0.5}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.fg }]}>DeepL</Text>
        {state.kind === 'success' && (
          <View style={[styles.langTag, { backgroundColor: c.accentSoft }]}>
            <Text style={[styles.langText, { color: c.accent }]}>
              {state.detectedLanguage} → EN
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Section label="Original">
          <Text
            style={[
              styles.original,
              { backgroundColor: c.bgSunken, color: c.fg },
            ]}
          >
            {text}
          </Text>
        </Section>

        <Section label="Translation">
          {state.kind === 'loading' ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={c.fg} />
            </View>
          ) : state.kind === 'error' ? (
            <Text style={[styles.translation, { color: c.error }]}>
              {state.message}
            </Text>
          ) : (
            <Text style={[styles.translation, { color: c.fg }]}>
              {state.translatedText}
            </Text>
          )}
        </Section>
      </View>

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <Pressable onPress={onDismiss} style={styles.closeBtn} hitSlop={6}>
          <Text style={[styles.closeLabel, { color: c.fgMuted }]}>Close</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.sectionLabel, { color: c.fgMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: fontSize.lg, fontWeight: '600' },
  langTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  langText: { fontSize: fontSize.xs, fontWeight: '500' },
  body: { paddingHorizontal: 22, gap: spacing.md, flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  original: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    fontFamily: fontFamily.jp,
    fontSize: fontSize.md,
  },
  translation: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  loadingRow: { paddingVertical: spacing.md, alignItems: 'flex-start' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingVertical: spacing.sm,
  },
  closeBtn: { alignSelf: 'flex-end', padding: 6 },
  closeLabel: { fontSize: fontSize.sm, fontWeight: '500' },
});
