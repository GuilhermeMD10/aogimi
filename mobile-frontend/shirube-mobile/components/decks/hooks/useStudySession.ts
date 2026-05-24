import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDeck, fetchDeckCards, reviewCard } from '../utils/decksApi';
import type { CardRecord, DeckRecord } from '../types';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';

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
  const { data, loading, error, refresh } = useFetchWithAbort<{ deck: DeckRecord; cards: CardRecord[] }>(
    async (signal) => {
      const [deck, cards] = await Promise.all([
        fetchDeck(deckId, signal),
        fetchDeckCards(deckId, signal),
      ]);
      return { deck, cards: shuffle(cards) };
    },
    [deckId],
  );

  const [queue, setQueue] = useState<CardRecord[]>([]);
  const [totalAtStart, setTotalAtStart] = useState(0);
  const [side, setSide] = useState<StudySide>('front');
  const [reviewed, setReviewed] = useState(0);
  const [known, setKnown] = useState(0);
  const [toReview, setToReview] = useState(0);

  // Reset session state every time a fresh deck+cards payload arrives (mount or restart).
  useEffect(() => {
    if (!data) return;
    setQueue(data.cards);
    setTotalAtStart(data.cards.length);
    setSide('front');
    setReviewed(0);
    setKnown(0);
    setToReview(0);
  }, [data]);

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

  const restart = useCallback(() => {
    void refresh();
  }, [refresh]);

  const current = queue[0] ?? null;
  const finished = !loading && !error && totalAtStart > 0 && queue.length === 0;

  return useMemo(
    () => ({
      deck: data?.deck ?? null,
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
    [data?.deck, loading, error, queue, current, side, reviewed, known, toReview, totalAtStart, finished, reveal, flip, markKnown, markUnknown, restart],
  );
}
