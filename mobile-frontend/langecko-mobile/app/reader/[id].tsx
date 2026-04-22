import { useLocalSearchParams } from 'expo-router';
import { ReaderScreen } from '@/components/reader/ReaderScreen';

export default function ReaderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReaderScreen bookId={String(id)} />;
}
