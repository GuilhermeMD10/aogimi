import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/I18nContext';
import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

// Three equal-weight buttons. Visual differentiation (color cues for
// Again / Hard / Easy) lands in the polish phase — keeping it neutral
// here so the user grades honestly rather than gravitating to the
// "highlighted" option.
export function ResultButtons({ onResult, disabled }: Props) {
  const t = useT();
  return (
    <View style={styles.row}>
      <Button
        label={t('study.again')}
        onPress={() => onResult('again')}
        variant="secondary"
        disabled={disabled}
        full
        style={{ flex: 1 }}
      />
      <Button
        label={t('study.hard')}
        onPress={() => onResult('hard')}
        variant="secondary"
        disabled={disabled}
        full
        style={{ flex: 1 }}
      />
      <Button
        label={t('study.easy')}
        onPress={() => onResult('easy')}
        variant="secondary"
        disabled={disabled}
        full
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
});
