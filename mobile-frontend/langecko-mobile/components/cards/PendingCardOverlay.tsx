import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, fontFamily, radius, spacing } from '@/theme/tokens';
import { useReaderState } from '@/components/providers/ReaderStateContext';

export function PendingCardOverlay() {
  const { pendingCardWord, setPendingCardWord } = useReaderState();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  if (!pendingCardWord) return null;

  const dismiss = () => setPendingCardWord(null);

  const openCards = () => {
    router.push('/(tabs)/cards');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe} pointerEvents="box-none">
      <View style={styles.banner}>
        <View style={styles.body}>
          <Text style={styles.title}>Card queued</Text>
          <Text style={styles.word} numberOfLines={1}>{pendingCardWord}</Text>
        </View>
        <Pressable
          onPress={openCards}
          android_ripple={{ color: '#00000020' }}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.openLabel}>Open Cards</Text>
        </Pressable>
        <Pressable
          onPress={dismiss}
          hitSlop={8}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: Colors) =>
  StyleSheet.create({
    safe: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      zIndex: 99,
      elevation: 99,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accent,
      shadowColor: c.shadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 8,
      elevation: 6,
    },
    body: { flex: 1 },
    title: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: c.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    word: {
      marginTop: 2,
      fontFamily: fontFamily.serifSemiBold,
      fontSize: fontSize.md,
      color: c.textPrimary,
    },
    openBtn: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: c.accent,
    },
    openLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: c.accentOn,
    },
    closeBtn: {
      paddingHorizontal: spacing.xs,
    },
    closeLabel: {
      fontSize: fontSize.md,
      color: c.accent,
    },
  });
