import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/theme/tokens';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function SearchBar({ value, onChange, onSubmit, loading }: SearchBarProps) {
  return (
    <View style={styles.row}>
      <Input
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Kanji, kana, or English (e.g. 食べる / たべる / eat)"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      <Button
        label={loading ? 'Searching…' : 'Search'}
        variant="primary"
        onPress={onSubmit}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: { flex: 1 },
});
