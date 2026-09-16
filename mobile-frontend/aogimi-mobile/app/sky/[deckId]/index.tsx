import { useLocalSearchParams } from 'expo-router';
import { CardsListScreen } from '@/features/sky/stage/views/CardsListScreen';

export default function DeckCardsRoute() {
  const { deckId: rawDeckId } = useLocalSearchParams<{ deckId: string }>();
  return <CardsListScreen deckId={String(rawDeckId)} />;
}
