import { HomeScreen as DefaultHomeScreen } from '@/components/home/HomeScreen';
import { useThemedComponent } from '@/themes/useThemedComponent';

export default function ReaderTab() {
  const HomeScreen = useThemedComponent('HomeScreen', DefaultHomeScreen);
  return <HomeScreen />;
}
