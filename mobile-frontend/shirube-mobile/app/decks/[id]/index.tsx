import { useLocalSearchParams } from 'expo-router';
import { DeckDetailScreen } from '@/components/decks/ui/DeckDetailScreen';

export default function DeckDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DeckDetailScreen deckId={String(id)} />;
}
