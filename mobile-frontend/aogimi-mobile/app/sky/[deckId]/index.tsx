import { useLocalSearchParams } from 'expo-router';
import { DeckDetailScreen } from '@/features/sky/stage/components/DeckDetailScreen';

export default function DeckDetailRoute() {
  const { deckId: rawDeckId } = useLocalSearchParams<{ deckId: string }>();
  return <DeckDetailScreen deckId={String(rawDeckId)} />;
}
