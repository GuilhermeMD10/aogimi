'use client';

import { useEffect, useRef, useState } from 'react';
import { getWordDetails } from '../lib/dictApi';
import type { DetailsResponse } from '../types';

type Entry = { data?: DetailsResponse; error?: string };

/**
 * The kanji breakdown and example sentences for one entry, cached per word id.
 *
 * The rail already holds everything the detail pane shows above the fold, so
 * this only backs the two sections that need a second request. Walking the
 * results with ↑/↓ therefore fires one request per row you land on, and the
 * cache is what stops arrowing back up from re-fetching every one of them.
 *
 * **Requests are not cancelled when the selection moves on.** Doing that looks
 * tidier and is worse: on a fast scroll every fetch gets killed a moment before
 * it would have landed, so nothing is cached and coming back re-requests the
 * lot. Letting them finish warms the cache for free, and `inFlight` keeps it to
 * one request per id however often the effect re-runs. Everything outstanding
 * is aborted together when the page unmounts.
 *
 * `loading` is derived, not stored: an id with no cache entry yet *is* the
 * loading state. That keeps the hook free of synchronous setState in an effect,
 * and lets a cached id render with no intermediate frame at all.
 */
export function useWordDetails(id: number | null) {
  const [entries, setEntries] = useState<Record<number, Entry>>({});

  // Requests currently out, by word id. Two jobs: skip starting a duplicate
  // when the effect re-runs (it depends on `entries`, so it fires again every
  // time *any* request resolves), and give unmount something to abort.
  //
  // A controller per request, created here rather than one held for the life
  // of the mount: a single shared controller is aborted by the cleanup below,
  // and under StrictMode's mount → unmount → remount that happens immediately,
  // leaving the ref holding a permanently-aborted controller. Every later
  // fetch then failed on an already-aborted signal, nothing was ever written
  // to the cache, and both sections sat on their skeletons forever.
  const inFlight = useRef<Map<number, AbortController>>(new Map());

  useEffect(() => {
    const outstanding = inFlight.current;
    return () => {
      for (const controller of outstanding.values()) controller.abort();
      outstanding.clear();
    };
  }, []);

  useEffect(() => {
    if (id == null) return;
    if (entries[id] !== undefined) return;
    if (inFlight.current.has(id)) return;

    const controller = new AbortController();
    const { signal } = controller;
    inFlight.current.set(id, controller);

    getWordDetails(id, signal)
      .then((data) => {
        if (signal.aborted) return;
        setEntries((prev) => ({ ...prev, [id]: { data } }));
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setEntries((prev) => ({
          ...prev,
          [id]: { error: err instanceof Error ? err.message : 'Could not load this entry.' },
        }));
      })
      .finally(() => {
        // Only if it's still ours: an aborted request's `finally` runs after a
        // remount has already registered a fresh controller under the same id,
        // and deleting that one would let a duplicate fetch start.
        if (inFlight.current.get(id) === controller) inFlight.current.delete(id);
      });
  }, [id, entries]);

  const entry = id != null ? entries[id] : undefined;

  return {
    details: entry?.data ?? null,
    error: entry?.error ?? null,
    loading: id != null && entry === undefined,
  };
}
