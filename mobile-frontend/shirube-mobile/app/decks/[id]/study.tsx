import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudyScreen } from '@/components/study/ui/StudyScreen';
import { getDeck } from '@/components/decks/utils/deckLocalState';
import { useDeckOverrides } from '@/components/study/hooks/useDeckOverrides';
import { useColors } from '@/theme/ThemeContext';
import type { StudySessionConfig } from '@/components/study/types';

// Per-deck study route. Builds a session spec from the deck's saved
// override (falls back to defaults — see deckOverrides.ts) and looks
// up the deck name for the optional front label. StudyScreen itself
// is scope-agnostic; the route owns the deck-specific resolution.
export default function StudyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deckId = String(id);
  const c = useColors();
  const { loading, getFor } = useDeckOverrides();
  const [deckName, setDeckName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const deck = await getDeck(deckId);
      if (!cancelled && deck) setDeckName(deck.name);
    })();
    return () => { cancelled = true; };
  }, [deckId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.fg} />
      </View>
    );
  }

  const override = getFor(deckId);
  const spec: StudySessionConfig = {
    scope: 'deck',
    deckIds: [deckId],
    mode: override.mode,
    limit: override.sessionSize,
  };

  return <StudyScreen sessionSpec={spec} title={deckName} />;
}
