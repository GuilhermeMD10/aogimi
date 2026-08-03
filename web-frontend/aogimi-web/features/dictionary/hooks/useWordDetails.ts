'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { getWordDetails } from '../lib/dictApi';
import type { DetailsResponse } from '../types';

type Entry = { data?: DetailsResponse; error?: string };

/* ── The cache ──────────────────────────────────────────────────────────────
   Module scope, not component state, because three surfaces ask for the same
   entries: `/dictionary`'s pane, the reader's docked column and the reader's
   bubble. Held per component, each kept its own copy — the same word fetched up
   to three times, and looking a word up in the reader taught the page nothing.
   One map is also what lets `inFlight` dedupe *across* consumers.

   Never evicted. The payload is small, the dictionary is immutable, and the
   whole point is that coming back to an entry is free. It goes when the tab
   does. */
const cache = new Map<number, Entry>();

/* Requests currently out, by word id. Two jobs: keep two consumers (or one
   effect re-running) from starting the same fetch twice, and hold each
   request's own controller.

   A controller per request, not one per mount: a single shared controller is
   aborted by an unmount, and under StrictMode's mount → unmount → remount that
   happens immediately, leaving a permanently-aborted controller behind. Every
   later fetch then failed on an already-aborted signal, nothing was written to
   the cache, and both details sections sat on their skeletons forever. */
const inFlight = new Map<number, AbortController>();

const subscribers = new Set<() => void>();

function subscribe(onChange: () => void) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

function write(id: number, entry: Entry) {
  cache.set(id, entry);
  for (const onChange of subscribers) onChange();
}

/**
 * Start the request for `id` unless the answer is already here or on its way.
 *
 * **Nothing cancels this.** Two reasons, and the second is new now that the
 * cache is shared. Cancelling when the selection moves on looks tidier and is
 * worse: on a fast scroll every fetch is killed a moment before it would have
 * landed, so nothing is cached and coming back re-requests the lot. And with one
 * map behind every consumer, cancelling on *unmount* would mean closing the
 * reader's bubble aborts a request the page behind it is still waiting on. So a
 * request always runs to completion and the cache absorbs the result — a
 * half-finished fetch is worth keeping, and if the consumer that asked has gone
 * there is nobody left to disappoint.
 *
 * The controller therefore never fires today. It stays because it is the
 * single-flight token this map is keyed on, and because the request needs a
 * signal for the day something does want to abort one.
 */
function ensureDetails(id: number) {
  if (cache.has(id)) return;
  if (inFlight.has(id)) return;

  const controller = new AbortController();
  const { signal } = controller;
  inFlight.set(id, controller);

  getWordDetails(id, signal)
    .then((data) => {
      if (signal.aborted) return;
      write(id, { data });
    })
    .catch((err: unknown) => {
      if (signal.aborted) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      write(id, { error: err instanceof Error ? err.message : 'Could not load this entry.' });
    })
    .finally(() => {
      // Only if it's still ours: a stale request's `finally` can run after a
      // fresh controller has been registered under the same id, and deleting
      // that one would let a duplicate fetch start.
      if (inFlight.get(id) === controller) inFlight.delete(id);
    });
}

/**
 * The kanji breakdown and example sentences for one entry, out of a cache
 * shared by every surface that shows an entry.
 *
 * Callers already hold everything an entry shows above the fold, so this only
 * backs the two sections that need a second request. Walking results with ↑/↓
 * therefore fires one request per row you land on, and the cache is what stops
 * arrowing back up from re-fetching every one of them — or the reader from
 * re-fetching what the page has already got.
 *
 * `loading` is derived, not stored: an id with no cache entry yet *is* the
 * loading state. That keeps the hook free of synchronous setState in an effect,
 * and lets a cached id render with no intermediate frame at all — including the
 * first frame of a second consumer, which is most of the point of sharing.
 *
 * `useSyncExternalStore` rather than a subscription plus `setState`: the cache
 * is exactly an external store, and `cache.get(id)` is a stable reference until
 * that id is rewritten, which is what the snapshot contract asks for.
 */
export function useWordDetails(id: number | null) {
  const entry = useSyncExternalStore(
    subscribe,
    () => (id == null ? undefined : cache.get(id)),
    // Server render: nothing is cached, so every id reads as loading — the same
    // frame the client shows for an id nobody has asked for yet.
    () => undefined,
  );

  useEffect(() => {
    if (id == null) return;
    ensureDetails(id);
  }, [id]);

  return {
    details: entry?.data ?? null,
    error: entry?.error ?? null,
    loading: id != null && entry === undefined,
  };
}
