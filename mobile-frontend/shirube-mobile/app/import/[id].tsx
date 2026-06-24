import { useLocalSearchParams } from 'expo-router';
import { ImportBookScreen } from '@/components/books/ui/ImportBookScreen';

export default function ImportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ImportBookScreen bookId={String(id)} />;
}
