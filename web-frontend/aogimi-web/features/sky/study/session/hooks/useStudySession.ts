'use client';

// Owns the queue lifecycle, the algorithm computation and the per-card summary
// the finish screen reads. Backend POST is fire-and-forget; the in-session queue
// + local SRS computation drive the UI.
//
// **A session has two shapes, and the shape decides everything else:**
//
//   remote — cards come from `/api/study/session`. Grades run FSRS, POST, and
//            move the card's real memory state (when it's due; see `srs.isDue`).
//   local  — cards are handed in already loaded. **Nothing talks to the
//            backend: no session fetch, no review POST.** Grades are pure
//            progress — the queue advances and that is all that happens.
//
// Local *is* practice; there is no separate flag. That's deliberate: the two
// facts ("we didn't fetch these" and "these grades don't count") are the same
// fact, and a second boolean would let them disagree. The only way to reach a
// local session is `/sky`'s "Study ahead", which hands over the inventory the
// stage already holds — so a practice session cannot talk to the backend by
// construction, rather than by everyone remembering to skip the calls.
//
// (`StudyScreen` still reads `/api/study/prefs` on mount for which fields a card
// shows. That's a user setting, not session state, and it has to match what a
// real session renders — see `PracticeOverlay`.)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardRecord } from '@/features/sky/stage/types';
import { applyOutcome, type SrsApplyResult } from '../lib/srs';
import { advanceQueue } from '../lib/reviewQueue';
import { fetchStudySession, submitReview } from '../lib/studyApi';
import type {
  CardSessionEntry,
  SessionSummary,
  StudyOutcome,
  StudySessionConfig,
} from '../types';

const DEFAULT_SESSION_SIZE = 20;

const EMPTY_PERCARD: Record<string, CardSessionEntry> = {};

export type StudySide = 'front' | 'back';

/**
 * Where a session's cards come from — and therefore whether its grades count.
 *
 * `limit` on the local shape is applied *after* the shuffle, so a 4000-card
 * library gives a different sample each time rather than the same first N.
 */
export type StudySource =
  | { kind: 'remote'; spec: StudySessionConfig }
  | { kind: 'local'; cards: readonly CardRecord[]; limit?: number };

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
  /** True when nothing in this session touches the backend or the SRS state. */
  practice: boolean;
  summary: SessionSummary;
  reveal: () => void;
  flip: () => void;
  submit: (outcome: StudyOutcome) => void;
  undo: () => void;
  restart: () => void;
};

/** An Undo snapshot for a practice grade: the card exactly as it is, because
 *  practice changed nothing. Restoring it is a no-op on the card and re-seats
 *  it at the head of the queue, which is the whole of what Undo means here. */
function priorOf(card: CardRecord): SrsApplyResult['prior'] {
  return {
    difficulty: card.difficulty,
    stability: card.stability,
    last_outcomes: card.last_outcomes,
    last_reviewed_at: card.last_reviewed_at,
    next_due_at: card.next_due_at,
    state: card.state,
    peak_rank: card.peak_rank,
    reviewed_times: card.reviewed_times,
  };
}

/** Fisher–Yates. Local sessions shuffle rather than ordering — "hardest first"
 *  is a triage ordering, and a session that can't earn anything has nothing to
 *  triage. */
function shuffled<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function useStudySession(source: StudySource): StudyState {
  const practice = source.kind === 'local';

  // The two sources key the seeding effect differently: a remote spec is value-
  // compared (it's rebuilt each render), a local card array is reference-
  // compared (it comes from a `useMemo` upstream and is huge — stringifying it
  // every render would cost more than the session does).
  const specKey = source.kind === 'remote' ? JSON.stringify(source.spec) : null;
  const localCards = source.kind === 'local' ? source.cards : null;
  const localLimit = source.kind === 'local' ? source.limit : undefined;

  const [queue, setQueue] = useState<CardRecord[]>([]);
  const [totalAtStart, setTotalAtStart] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [side, setSide] = useState<StudySide>('front');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [perCard, setPerCard] = useState<Record<string, CardSessionEntry>>(EMPTY_PERCARD);

  const lastReviewRef = useRef<{ card: CardRecord; prior: SrsApplyResult['prior'] } | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const seed = (cards: CardRecord[]) => {
      setQueue(cards);
      setTotalAtStart(cards.length);
      setReviewed(0);
      setSide('front');
      setPerCard(EMPTY_PERCARD);
    };

    setError(null);
    lastReviewRef.current = null;
    setCanUndo(false);

    // Local: the cards are already here. No request, no await, no loading
    // state — going through a promise just to resolve a value we're holding
    // would paint a "Loading…" frame over a session that is ready to start.
    if (localCards) {
      const picked = shuffled(localCards);
      seed(localLimit ? picked.slice(0, localLimit) : picked);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);

      try {
        const parsedSpec = JSON.parse(specKey!) as StudySessionConfig;
        if (!parsedSpec.limit) parsedSpec.limit = DEFAULT_SESSION_SIZE;
        const res = await fetchStudySession(parsedSpec, controller.signal);
        if (cancelled) return;
        seed(res.cards);
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
  }, [specKey, localCards, localLimit, reloadKey]);

  const reveal = useCallback(() => setSide('back'), []);
  const flip = useCallback(() => setSide((s) => (s === 'front' ? 'back' : 'front')), []);
  const restart = useCallback(() => setReloadKey((k) => k + 1), []);

  /**
   * Grade the current card.
   *
   * **Nothing with a side effect may move inside the `setQueue` updater.** All of this used to live
   * in there, reading the queue head off the `q` argument — which looks like the careful choice
   * (always the freshest queue, no stale closure) and is why it was written that way. But React
   * requires an updater to be a *pure* function of the previous state and deliberately invokes it
   * twice in Strict Mode to surface impurity, which the App Router turns on by default. So every
   * review fired `submitReview` twice, wrote two `card_reviews` rows, and the ledger's recent
   * upgrades showed the same card promoting twice at the same instant.
   *
   * Reading the head from `queue` instead costs a `queue` dependency, which is free: the state object
   * this hook returns already lists both `queue` and `submit`, so its identity was changing per
   * review regardless. Grading is gated on `side === 'back'` and this flips it to `'front'`, and
   * React flushes discrete events one at a time, so there is no same-tick second grade to race.
   */
  const submit = useCallback(
    (outcome: StudyOutcome) => {
      const current = queue[0];
      if (!current) return;

      // A local session is practice: the four buttons are the same four buttons, and all any of
      // them does is move the bar. No FSRS, no POST, no card mutation — and no re-queue either,
      // so every grade advances and the session is finite and monotonic. `applyOutcome` isn't
      // even called: it would correctly return `applied: false` for these cards, but asking it
      // implies the answer could be yes, and here it structurally cannot.
      if (practice) {
        lastReviewRef.current = { card: current, prior: priorOf(current) };
        setQueue((q) => q.slice(1));
        setCanUndo(true);
        setReviewed((n) => n + 1);
        setSide('front');
        setPerCard((prev) => {
          const existing = prev[current.id];
          return {
            ...prev,
            [current.id]: {
              card: current,
              startState: existing?.startState ?? current.state,
              endState: current.state,
              outcomes: existing ? [...existing.outcomes, outcome] : [outcome],
              finalDifficulty: current.difficulty,
            },
          };
        });
        return;
      }

      const { next, prior, applied } = applyOutcome(current, outcome);

      // `applied: false` means the card wasn't due — grading ahead moves nothing, not even
      // `reviewed_times`. Reusing `current` unchanged rather than rebuilding an identical object
      // also keeps its reference stable, so the re-seated card doesn't churn React's keys.
      const updatedCurrent: CardRecord = applied
        ? {
            ...current,
            difficulty:       next.difficulty,
            stability:        next.stability,
            last_outcomes:    next.last_outcomes,
            last_reviewed_at: next.last_reviewed_at,
            next_due_at:      next.next_due_at,
            state:            next.state,
            peak_rank:        next.peak_rank,
            reviewed_times:   current.reviewed_times + 1,
          }
        : current;

      // Web has no local card store, so we just fire the POST and mutate the in-memory card here
      // for UI feedback. If the POST fails the next session reload will pull fresh card state from
      // the backend (which still reflects the prior review).
      //
      // Skipped when the card isn't due: the server would run its own `isDue` check and do nothing,
      // so the request is pure waste. The server check remains the authority; this is an
      // optimisation over it, which is why the condition is the same function the server calls.
      if (applied) submitReview(current.id, outcome).catch(() => {});
      lastReviewRef.current = { card: updatedCurrent, prior };

      // Still an updater, because this one *is* pure — it only has to drop whatever head the latest
      // queue has and re-seat the graded card.
      setQueue((q) => advanceQueue(q.slice(1), updatedCurrent, outcome));
      setCanUndo(true);
      setReviewed((n) => n + 1);
      setSide('front');

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
    },
    [queue, practice],
  );

  const undo = useCallback(() => {
    const snapshot = lastReviewRef.current;
    if (!snapshot) return;

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
      const filtered = q.filter((c) => c.id !== restored.id);
      return [restored, ...filtered];
    });
    setReviewed((n) => Math.max(0, n - 1));
    setSide('front');

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
      practice,
      summary,
      reveal,
      flip,
      submit,
      undo,
      restart,
    }),
    [loading, error, queue, current, side, reviewed, totalAtStart, finished, canUndo, practice, summary, reveal, flip, submit, undo, restart],
  );
}
