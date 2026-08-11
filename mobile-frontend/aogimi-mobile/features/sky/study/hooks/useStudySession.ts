// Owns the lifecycle of one study session: fetch → review → finish.
// Coordinates three things on every result tap: algorithm computation,
// local card state update, and backend submission. Backend POST is
// fire-and-forget — the local card state and queue are always
// authoritative for the in-session UX. If a POST fails the user just
// loses one event row from card_reviews; their next session sees the
// correct card state because that lives in the local store.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardRecord } from '../../stage/types';
import {
  applyLocalReview,
  getAllCards,
  getCardsByDeckId,
  revertLocalReview,
} from '../../stage/lib/cardLocalState';
import { applyOutcome, isDue, type SrsApplyResult } from '../lib/srs';
import { orderByMode } from '../lib/orderByMode';
import { advanceQueue } from '../lib/reviewQueue';
import { fetchStudySession, submitReview } from '../lib/studyApi';
import type {
  CardSessionEntry,
  SessionSummary,
  StudyOutcome,
  StudySessionConfig,
} from '../types';

const EMPTY_SUMMARY_MAP: Record<string, CardSessionEntry> = {};

const DEFAULT_SESSION_SIZE = 20;

export type StudySide = 'front' | 'back';

export type StudyState = {
  loading: boolean;
  error: string | null;
  queue: CardRecord[];
  current: CardRecord | null;
  side: StudySide;
  reviewed: number;
  totalAtStart: number;
  finished: boolean;
  canUndo: boolean;
  summary: SessionSummary;
  reveal: () => void;
  flip: () => void;
  submit: (outcome: StudyOutcome) => void;
  undo: () => void;
  restart: () => void;
};

async function resolveSession(
  spec: StudySessionConfig,
  signal: AbortSignal,
): Promise<CardRecord[]> {
  // Signed-in happy path: backend orders + slices for us, including
  // SRS weighting that the local fallback can't fully match (the
  // backend has the authoritative card_reviews log).
  try {
    const res = await fetchStudySession(spec, signal);
    return res.cards;
  } catch (err) {
    if (signal.aborted) throw err;
    // Fall through to local — signed-out or offline.
  }

  const limit = spec.limit ?? DEFAULT_SESSION_SIZE;
  const isCrossDeck = spec.scope === 'all' || spec.mode === 'hardest_all_decks';

  let cards: CardRecord[];
  if (isCrossDeck) {
    const all = await getAllCards();
    cards = all.filter((c) => c.pendingOp !== 'delete');
  } else if (spec.deckIds && spec.deckIds.length === 1) {
    const localCards = await getCardsByDeckId(spec.deckIds[0]!);
    cards = localCards.filter((c) => c.pendingOp !== 'delete');
  } else if (spec.deckIds && spec.deckIds.length > 0) {
    const perDeck = await Promise.all(
      spec.deckIds.map((id) => getCardsByDeckId(id)),
    );
    cards = perDeck.flat().filter((c) => c.pendingOp !== 'delete');
  } else {
    cards = [];
  }

  // Apply `dueOnly` here too. The backend filters the pool before ordering it,
  // and this path has to match — otherwise an offline session serves cards that
  // aren't due, the user grades them, and `applyOutcome`'s due gate discards
  // every answer. Visible work, no effect, no explanation.
  //
  // `isDue` is the same predicate the server's SQL uses, mirrored in `srs.ts`,
  // so a card offered here is one a later sync will accept a review for.
  if (spec.dueOnly) {
    const now = new Date();
    cards = cards.filter((c) => isDue(c, now));
  }

  return orderByMode(cards, spec.mode).slice(0, limit);
}

export function useStudySession(spec: StudySessionConfig): StudyState {
  // Stable string key so consumers don't have to memoize the spec
  // object — JSON.stringify on a 4-key blob is trivially cheap.
  const specKey = JSON.stringify(spec);

  const [queue, setQueue] = useState<CardRecord[]>([]);
  const [totalAtStart, setTotalAtStart] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [side, setSide] = useState<StudySide>('front');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Per-card session entries, keyed by card id. Plain object instead of
  // Map for cheap shallow copies and dependency stability. Cleared on
  // restart; updated on every submit and adjusted on undo.
  const [perCard, setPerCard] = useState<Record<string, CardSessionEntry>>(EMPTY_SUMMARY_MAP);

  // Single-step undo buffer. Cleared on restart and on a fresh submit.
  // We keep this in a ref *and* expose `canUndo` so the button can
  // disable itself without forcing a re-render every time the buffer
  // changes (it changes on every submit, which already re-renders).
  const lastReviewRef = useRef<{ card: CardRecord; prior: SrsApplyResult['prior'] } | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      lastReviewRef.current = null;
      setCanUndo(false);

      try {
        const parsedSpec = JSON.parse(specKey) as StudySessionConfig;
        const cards = await resolveSession(parsedSpec, controller.signal);
        if (cancelled) return;
        setQueue(cards);
        setTotalAtStart(cards.length);
        setReviewed(0);
        setSide('front');
        setPerCard(EMPTY_SUMMARY_MAP);
      } catch (err: unknown) {
        if (cancelled) return;
        if ((err as { name?: string })?.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Failed to load session';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [specKey, reloadKey]);

  const reveal = useCallback(() => setSide('back'), []);
  const flip = useCallback(() => setSide((s) => (s === 'front' ? 'back' : 'front')), []);
  const restart = useCallback(() => setReloadKey((k) => k + 1), []);

  const submit = useCallback((outcome: StudyOutcome) => {
    setQueue((q) => {
      if (q.length === 0) return q;
      const [current, ...tail] = q;
      if (!current) return q;

      const { applied, next, prior } = applyOutcome(current, outcome);

      // **A review only counts if the card is due.** Grading ahead of schedule
      // changes nothing at all — no stability, no rank, no schedule, no
      // `card_reviews` row, no `reviewed_times`. The server enforces this and
      // is the authority; `applyOutcome` runs the same check so the UI never
      // promises a promotion the POST is about to refuse, and so we can skip
      // the round trip entirely rather than send a write we know is a no-op.
      //
      // The card still advances through the queue: the user answered it, and
      // the session should move on. It just doesn't earn anything.
      if (applied) {
        // Persist locally so the next session sees the new state; never
        // marks the card as pending (review sync is a separate concern
        // from card create/update/delete).
        void applyLocalReview(current.id, {
          difficulty:       next.difficulty,
          stability:        next.stability,
          last_outcomes:    next.last_outcomes,
          last_reviewed_at: next.last_reviewed_at,
          next_due_at:      next.next_due_at,
          state:            next.state,
          peak_rank:        next.peak_rank,
        });

        // Backend update is best-effort; the local store wins for any
        // in-session UX. A swallowed failure here just means stats are
        // one event short; the next review on the same card overwrites
        // the backend card row anyway.
        submitReview(current.id, outcome).catch(() => {});
      }

      const updatedCurrent: CardRecord = {
        ...current,
        difficulty:       next.difficulty,
        stability:        next.stability,
        last_outcomes:    next.last_outcomes,
        last_reviewed_at: next.last_reviewed_at,
        next_due_at:      next.next_due_at,
        state:            next.state,
        peak_rank:        next.peak_rank,
        reviewed_times:   applied ? current.reviewed_times + 1 : current.reviewed_times,
      };

      lastReviewRef.current = { card: updatedCurrent, prior };
      setCanUndo(true);
      setReviewed((n) => n + 1);
      setSide('front');

      // Track this card's session arc. The first encounter pins the
      // startState; subsequent submits on the same card only update
      // endState + outcomes + finalDifficulty.
      setPerCard((prev) => {
        const existing = prev[current.id];
        const startState = existing?.startState ?? prior.state;
        return {
          ...prev,
          [current.id]: {
            card: updatedCurrent,
            startState,
            endState: next.state,
            outcomes: existing ? [...existing.outcomes, outcome] : [outcome],
            finalDifficulty: next.difficulty,
          },
        };
      });

      return advanceQueue(tail, updatedCurrent, outcome);
    });
  }, []);

  const undo = useCallback(() => {
    const snapshot = lastReviewRef.current;
    if (!snapshot) return;

    void revertLocalReview(snapshot.card.id, snapshot.prior);

    const restored: CardRecord = {
      ...snapshot.card,
      difficulty:       snapshot.prior.difficulty,
      stability:        snapshot.prior.stability,
      last_outcomes:    snapshot.prior.last_outcomes,
      last_reviewed_at: snapshot.prior.last_reviewed_at,
      next_due_at:      snapshot.prior.next_due_at,
      state:            snapshot.prior.state,
      peak_rank:        snapshot.prior.peak_rank,
      reviewed_times:   snapshot.prior.reviewed_times,
    };

    setQueue((q) => {
      // The card may currently be at any position (Again/Hard requeue)
      // or absent (Easy). Strip every copy, then put it back at the
      // head so the user immediately sees the card they just acted on.
      const filtered = q.filter((c) => c.id !== restored.id);
      return [restored, ...filtered];
    });
    setReviewed((n) => Math.max(0, n - 1));
    setSide('front');

    // Roll back the per-card entry: pop the last outcome. If the popped
    // outcome was the only one, drop the entry entirely so the card
    // doesn't appear in the session summary at all.
    setPerCard((prev) => {
      const existing = prev[snapshot.card.id];
      if (!existing) return prev;
      if (existing.outcomes.length <= 1) {
        const next = { ...prev };
        delete next[snapshot.card.id];
        return next;
      }
      return {
        ...prev,
        [snapshot.card.id]: {
          ...existing,
          card: restored,
          endState: snapshot.prior.state,
          finalDifficulty: snapshot.prior.difficulty,
          outcomes: existing.outcomes.slice(0, -1),
        },
      };
    });

    lastReviewRef.current = null;
    setCanUndo(false);
  }, []);

  const current = queue[0] ?? null;
  const finished = !loading && !error && totalAtStart > 0 && queue.length === 0;

  const summary: SessionSummary = useMemo(() => {
    const entries = Object.values(perCard);
    return {
      uniqueCards: entries.length,
      reviewedTotal: reviewed,
      perCard: entries,
    };
  }, [perCard, reviewed]);

  return useMemo(
    () => ({
      loading,
      error,
      queue,
      current,
      side,
      reviewed,
      totalAtStart,
      finished,
      canUndo,
      summary,
      reveal,
      flip,
      submit,
      undo,
      restart,
    }),
    [loading, error, queue, current, side, reviewed, totalAtStart, finished, canUndo, summary, reveal, flip, submit, undo, restart],
  );
}
