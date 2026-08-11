import { useLocalSearchParams } from 'expo-router';
import { ImportBookScreen } from '@/features/books/library/components/ImportBookScreen';

export default function ImportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ImportBookScreen bookId={String(id)} />;
}
