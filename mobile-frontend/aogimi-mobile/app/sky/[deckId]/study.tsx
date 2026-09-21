import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StudyScreen } from '@/features/sky/study/components/StudyScreen';
import { Screen } from '@/shared/components/Screen';
import { getDeck } from '@/features/sky/stage/lib/deckLocalState';
import { useDeckOverrides } from '@/features/sky/study/hooks/useDeckOverrides';
import { usePalette } from '@/theme/ThemeContext';
import type { StudySessionConfig } from '@/features/sky/study/types';

// Per-deck study route. Builds a session spec from the deck's saved
// override (falls back to defaults — see deckOverrides.ts) and looks
// up the deck name for the optional front label. StudyScreen itself
// is scope-agnostic; the route owns the deck-specific resolution.
export default function StudyRoute() {
  const { deckId: rawDeckId } = useLocalSearchParams<{ deckId: string }>();
  const deckId = String(rawDeckId);
  const p = usePalette();
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

  // The overrides read is local and near-instant, but it gates the spec, so
  // the canvas is drawn behind the spinner rather than a flat fill flashing
  // before the session's own `Screen` mounts under it.
  if (loading) {
    return (
      <Screen>
        <View style={styles.centred}>
          <ActivityIndicator color={p.accent} />
        </View>
      </Screen>
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

const styles = StyleSheet.create({
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
