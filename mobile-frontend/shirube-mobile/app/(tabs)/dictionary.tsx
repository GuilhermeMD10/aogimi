import { DictionaryScreen as DefaultDictionaryScreen } from '@/components/dictionary/ui/DictionaryScreen';
import { useThemedComponent } from '@/themes/useThemedComponent';

export default function DictionaryTab() {
  const DictionaryScreen = useThemedComponent('DictionaryScreen', DefaultDictionaryScreen);
  return <DictionaryScreen />;
}
