import { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, fontFamily, spacing } from '@/theme/tokens';

interface ScreenProps {
  title?: string;
  children: ReactNode;
}

export function Screen({ title, children }: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </SafeAreaView>
  );
}

const createStyles = (c: Colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bgBase,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    title: {
      fontFamily: fontFamily.serifSemiBold,
      fontSize: fontSize.xxl,
      color: c.textPrimary,
      marginBottom: spacing.md,
    },
  });
