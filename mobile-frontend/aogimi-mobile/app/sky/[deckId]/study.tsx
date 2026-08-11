import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudyScreen } from '@/features/sky/study/components/StudyScreen';
import { getDeck } from '@/features/sky/stage/lib/deckLocalState';
import { useDeckOverrides } from '@/features/sky/study/hooks/useDeckOverrides';
import { useColors } from '@/theme/ThemeContext';
import type { StudySessionConfig } from '@/features/sky/study/types';

// Per-deck study route. Builds a session spec from the deck's saved
// override (falls back to defaults — see deckOverrides.ts) and looks
// up the deck name for the optional front label. StudyScreen itself
// is scope-agnostic; the route owns the deck-specific resolution.
export default function StudyRoute() {
  const { deckId: rawDeckId } = useLocalSearchParams<{ deckId: string }>();
  const deckId = String(rawDeckId);
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
    // See `app/sky/study.tsx` — a session whose grades are meant to count has
    // to be due-filtered, or it serves cards that can't earn anything. The
    // deck's saved mode still decides the *order*; this only narrows the pool.
    dueOnly: true,
  };

  return <StudyScreen sessionSpec={spec} title={deckName} />;
}
