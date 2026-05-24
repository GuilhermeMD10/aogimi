import { useLocalSearchParams } from 'expo-router';
import { StudyScreen } from '@/components/decks/ui/StudyScreen';

export default function StudyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StudyScreen deckId={String(id)} />;
}
