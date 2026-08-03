'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { Button, coverPalette } from '@/shared/components';
import { decksApi, deckVisuals } from '../decks';
import { useDecks } from '../decks/providers/DecksProvider';
import { StudyScreen, fetchDueCounts, useDeckOverrides } from '../session';
import type { SessionDeck, StudySessionConfig } from '../session/types';

/**
 * `/study` — the study runner's own route.
 *
 * Lives at the domain root rather than inside `study/session` because it needs
 * both sub-features: the session runner *and* the decks layer (deck names, the
 * per-deck due count, per-deck overrides). Sub-features don't import each
 * other; an orchestrator at the domain root composes them.
 *
 * Query params, and the three sessions they select:
 *
 *   /study                 every deck, `hardest_all_decks`, capped at 20
 *   /study?deck={id}       one deck, mode + size from its saved override
 *   /study?due=1           every due card, shuffled  (+ &deck={id} to scope it)
 *
 * A due session studies *everything* due, so its size is the due count — which
 * has to be fetched before the spec exists. Hence the gate below: the runner
 * doesn't mount until its config is final, because `useStudySession` fires its
 * fetch off the spec and a spec that changed a beat later would start one
 * session and then throw it away.
 */

const ALL_HARDEST_SESSION_SIZE = 20;

export default function StudyView() {
  const router = useRouter();
  const params = useSearchParams();
  const deckId = params.get('deck');
  const dueOnly = params.get('due') === '1';

  const { decks } = useDecks();
  const { getFor, loading: overridesLoading } = useDeckOverrides();

  // Only a due session needs a count; every other shape has a static size.
  const dueCount = useFetchWithAbort<number>(
    (signal) =>
      deckId
        ? decksApi.getDueDeckCardCount(deckId, signal)
        : fetchDueCounts(signal).then((counts) => counts.total),
    [deckId],
    { enabled: dueOnly },
  );

  const exit = useCallback(() => router.push('/decks'), [router]);

  const spec = resolveSpec({
    deckId,
    dueOnly,
    dueCount: dueCount.data,
    override: deckId && !overridesLoading ? getFor(deckId) : null,
  });

  if (dueCount.error) {
    return (
      <Notice message={dueCount.error} onExit={exit} />
    );
  }

  // Waiting on the due count or on the saved overrides.
  if (!spec) return <Notice message="Loading…" onExit={exit} muted />;

  // The header's deck identity. Resolved here rather than in the runner: the
  // glyph comes from `deckVisuals`, which belongs to the *decks* sub-feature,
  // and sub-features don't import each other — the orchestrator that already
  // holds both is the place the two meet.
  const deck = deckId ? decks?.find((d) => d.id === deckId) ?? null : null;
  const sessionDeck: SessionDeck | null = deck
    ? { name: deck.name, kamon: deckVisuals(deck.name).kamon, ...coverPalette(deck.name) }
    : null;

  return (
    <div className="relative h-full min-h-0">
      <StudyScreen
        sessionSpec={spec}
        deck={sessionDeck}
        // Only read when there's no deck. The two cross-deck sessions have none
        // to name, so the header carries their scope instead; a deck-scoped
        // session whose row hasn't arrived yet gets the neutral label rather
        // than a wrong claim about its scope.
        scopeLabel={deckId ? 'Study session' : dueOnly ? 'Due today' : 'All decks'}
        onExit={exit}
      />
    </div>
  );
}

/**
 * Returns null while a dependency the spec needs is still resolving.
 *
 * `limit` is always explicit: the backend defaults a missing limit to 20, so a
 * due session has to state its own size or it would silently cap at 20 cards.
 */
function resolveSpec({
  deckId,
  dueOnly,
  dueCount,
  override,
}: {
  deckId: string | null;
  dueOnly: boolean;
  dueCount: number | null;
  override: { mode: StudySessionConfig['mode']; sessionSize: number } | null;
}): StudySessionConfig | null {
  if (dueOnly) {
    if (dueCount === null) return null;
    // Shuffled rather than hardest-first: a due queue is already the set that
    // needs attention, so ordering it by difficulty just front-loads the pain.
    const base = { mode: 'random' as const, dueOnly: true, limit: dueCount };
    return deckId
      ? { scope: 'deck', deckIds: [deckId], ...base }
      : { scope: 'all', ...base };
  }

  if (deckId) {
    if (!override) return null;
    return {
      scope: 'deck',
      deckIds: [deckId],
      mode: override.mode,
      limit: override.sessionSize,
    };
  }

  return { scope: 'all', mode: 'hardest_all_decks', limit: ALL_HARDEST_SESSION_SIZE };
}

function Notice({
  message,
  onExit,
  muted = false,
}: {
  message: string;
  onExit: () => void;
  muted?: boolean;
}) {
  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-4.5 p-6 text-center font-[family-name:var(--face-ui)] font-medium">
      <p className={`m-0 text-[15px] ${muted ? 'text-(--muted)' : 'text-(--soft)'}`}>{message}</p>
      {!muted && (
        <Button variant="secondary" onClick={onExit}>
          Back to decks
        </Button>
      )}
    </div>
  );
}
