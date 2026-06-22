'use client';

// Mirror of mobile components/study/hooks/useStudySession.ts. Owns the
// queue lifecycle, algorithm computation, and the per-card session
// summary used by the finish screen. Backend POST is fire-and-forget;
// the in-session queue + local SRS computation drive the UI.
//
// Web has no local card store so the offline branch from mobile is
// skipped here — if /api/study/session fails we surface the error.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardRecord } from '../../decks/types';
import { applyOutcome, type SrsApplyResult } from '../algorithm/srs';
import { advanceQueue } from '../utils/reviewQueue';
import { fetchStudySession, submitReview } from '../utils/studyApi';
import type {
  CardSessionEntry,
  SessionSummary,
  StudyOutcome,
  StudySessionConfig,
} from '../types';

const DEFAULT_SESSION_SIZE = 20;

const EMPTY_PERCARD: Record<string, CardSessionEntry> = {};

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

export function useStudySession(spec: StudySessionConfig): StudyState {
  const specKey = JSON.stringify(spec);

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

    (async () => {
      setLoading(true);
      setError(null);
      lastReviewRef.current = null;
      setCanUndo(false);

      try {
        const parsedSpec = JSON.parse(specKey) as StudySessionConfig;
        if (!parsedSpec.limit) parsedSpec.limit = DEFAULT_SESSION_SIZE;
        const res = await fetchStudySession(parsedSpec, controller.signal);
        if (cancelled) return;
        setQueue(res.cards);
        setTotalAtStart(res.cards.length);
        setReviewed(0);
        setSide('front');
        setPerCard(EMPTY_PERCARD);
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

      const { next, prior } = applyOutcome(current, outcome);

      // Web has no local card store, so we just fire the POST and
      // mutate the in-memory card here for UI feedback. If the POST
      // fails the next session reload will pull fresh card state from
      // the backend (which still reflects the prior review).
      submitReview(current.id, outcome).catch(() => {});

      const updatedCurrent: CardRecord = {
        ...current,
        difficulty:       next.difficulty,
        stability:        next.stability,
        last_outcomes:    next.last_outcomes,
        last_reviewed_at: next.last_reviewed_at,
        state:            next.state,
        reviewed_times:   current.reviewed_times + 1,
      };

      lastReviewRef.current = { card: updatedCurrent, prior };
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

      return advanceQueue(tail, updatedCurrent, outcome);
    });
  }, []);

  const undo = useCallback(() => {
    const snapshot = lastReviewRef.current;
    if (!snapshot) return;

    const restored: CardRecord = {
      ...snapshot.card,
      difficulty:       snapshot.prior.difficulty,
      stability:        snapshot.prior.stability,
      last_outcomes:    snapshot.prior.last_outcomes,
      last_reviewed_at: snapshot.prior.last_reviewed_at,
      state:            snapshot.prior.state,
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
