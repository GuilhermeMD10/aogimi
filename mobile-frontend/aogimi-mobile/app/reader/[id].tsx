import { useLocalSearchParams } from 'expo-router';
import { ReaderScreen } from '@/features/books/reader/components/ReaderScreen';

export default function ReaderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReaderScreen bookId={String(id)} />;
}
