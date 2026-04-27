import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDeck, fetchDeckCards, reviewCard } from '@/lib/api';
import type { CardRecord, DeckRecord } from '@/lib/types';

export type StudySide = 'front' | 'back';

export type StudyState = {
  deck: DeckRecord | null;
  loading: boolean;
  error: string | null;
  /** Ordered queue of remaining cards in the current session. */
  queue: CardRecord[];
  current: CardRecord | null;
  side: StudySide;
  reviewed: number;
  known: number;
  toReview: number;
  totalAtStart: number;
  finished: boolean;
  reveal: () => void;
  flip: () => void;
  markKnown: () => void;
  markUnknown: () => void;
  restart: () => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function useStudySession(deckId: string): StudyState {
  const [deck, setDeck] = useState<DeckRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queue, setQueue] = useState<CardRecord[]>([]);
  const [totalAtStart, setTotalAtStart] = useState(0);
  const [side, setSide] = useState<StudySide>('front');
  const [reviewed, setReviewed] = useState(0);
  const [known, setKnown] = useState(0);
  const [toReview, setToReview] = useState(0);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, cards] = await Promise.all([fetchDeck(deckId), fetchDeckCards(deckId)]);
      const shuffled = shuffle(cards);
      setDeck(d);
      setQueue(shuffled);
      setTotalAtStart(shuffled.length);
      setSide('front');
      setReviewed(0);
      setKnown(0);
      setToReview(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const reveal = useCallback(() => setSide('back'), []);
  const flip = useCallback(() => setSide((s) => (s === 'front' ? 'back' : 'front')), []);

  const markKnown = useCallback(() => {
    setQueue((q) => {
      const [head, ...rest] = q;
      if (!head) return q;
      // fire-and-forget review ping
      reviewCard(head.id).catch(() => {});
      return rest;
    });
    setKnown((n) => n + 1);
    setReviewed((n) => n + 1);
    setSide('front');
  }, []);

  const markUnknown = useCallback(() => {
    setQueue((q) => {
      const [head, ...rest] = q;
      if (!head) return q;
      return [...rest, head];
    });
    setToReview((n) => n + 1);
    setReviewed((n) => n + 1);
    setSide('front');
  }, []);

  const restart = useCallback(() => loadSession(), [loadSession]);

  const current = queue[0] ?? null;
  const finished = !loading && !error && totalAtStart > 0 && queue.length === 0;

  return useMemo(
    () => ({
      deck,
      loading,
      error,
      queue,
      current,
      side,
      reviewed,
      known,
      toReview,
      totalAtStart,
      finished,
      reveal,
      flip,
      markKnown,
      markUnknown,
      restart,
    }),
    [deck, loading, error, queue, current, side, reviewed, known, toReview, totalAtStart, finished, reveal, flip, markKnown, markUnknown, restart],
  );
}
