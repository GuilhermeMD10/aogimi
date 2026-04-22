import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';

type Props = {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, edges = ['top'], padded = false, style }: Props) {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: c.bg }, style]}>
      <View style={[styles.inner, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 24 },
});
