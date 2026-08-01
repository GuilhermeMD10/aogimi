'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDictionaryState } from '../providers/DictionaryStateProvider';
import { BeforeSearch } from '../components/BeforeSearch';
import { SearchView } from './SearchView';
import { EMPTY_RAIL, railContents, resolveSelection, selectionParam } from '../lib/results';
import type { Selection } from '../types';

/**
 * `/dictionary`. One route, two states:
 *
 *   nothing searched yet → the centred prompt (`BeforeSearch`)
 *   `?q=辞書`             → the results rail beside an entry (`SearchView`)
 *   `&id=` / `&kanji=`    → which row of that rail the entry pane is showing
 *
 * **The URL is the only source of truth here.** The field's text is local draft
 * state; pressing Enter puts it in the URL, and everything downstream — which
 * query has run, which row is selected — reads back out. That's what makes a
 * lookup linkable, the back button walk queries, and a reload land where you
 * were, and it means exactly one thing can change what the page shows.
 *
 * **Searching is explicit.** Nothing happens until Enter (or the search glyph).
 * No debounce, no query-as-you-type: the field would otherwise fire a request
 * for every prefix of a word, and on a screen where the results are the whole
 * layout, that means the page rearranging itself under someone mid-word.
 *
 * **The prompt doesn't come back.** Once a search has run, clearing the field
 * or walking back to a bare `/dictionary` keeps the rail and the last entry on
 * screen — `stickyQuery` remembers what's showing. The prompt is how the page
 * opens, not a state you can fall into while you're working in it. Leaving the
 * route unmounts this and resets it.
 *
 * Selection changes `replace` rather than `push`: the rail never leaves the
 * screen, so "back" to the row directly above is meaningless, and stacking one
 * history entry per arrow-key press would bury the query you actually want to
 * return to. New queries `push`.
 */
export default function DictionaryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { query: ranQuery, result, loading, error, runSearch } = useDictionaryState();

  // Trimmed, because everything downstream compares against it: the provider
  // trims before it searches, so an untidy deep link like `?q=%20辞書` would
  // otherwise never look "in sync" and the rail would load forever.
  const urlQuery = (searchParams.get('q') ?? '').trim();

  // The last query this visit actually ran. Survives the URL losing `q`, which
  // is what keeps the prompt from reappearing underneath someone.
  const [stickyQuery, setStickyQuery] = useState(urlQuery);
  const shownQuery = urlQuery || stickyQuery;

  const [draft, setDraft] = useState(urlQuery);

  /* ── URL → search, and → the sticky query ─────────────────────────────
     History is an external system, so noticing that it changed can only happen
     in an effect. The provider owns the request (and pushes the term to
     recents), so this just hands the query over once.

     An empty `q` is ignored rather than treated as "no query": that's the back
     button landing on the bare route, and the results stay put. */
  const lastRun = useRef<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!urlQuery) return;
    setStickyQuery(urlQuery);
    if (lastRun.current === urlQuery) return;
    lastRun.current = urlQuery;
    void runSearch(urlQuery);
  }, [urlQuery, runSearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ── Search → field ───────────────────────────────────────────────────
     A `?q=` link from home, a chip, a recent row or the back button all change
     what's showing without touching the field, so the field follows.

     Keyed on the query being *shown*, not on the URL, so clearing the field
     (which changes neither) isn't immediately undone. The updater form reads
     the current draft without making it a dependency, and returning it
     unchanged lets React bail out of the re-render entirely. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDraft((current) => (current.trim() === shownQuery ? current : shownQuery));
  }, [shownQuery]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const runTerm = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return; // Enter on an empty field shouldn't navigate anywhere.
      setDraft(trimmed);
      // `scroll: false`: the window never scrolls on this screen — the rail and
      // the entry pane are their own scroll containers and each resets itself.
      router.push(`/dictionary?q=${encodeURIComponent(trimmed)}`, { scroll: false });
    },
    [router],
  );

  // Empties the field so a new term can be typed. Deliberately does not
  // navigate: the results you were reading stay until you search for something
  // else.
  const clear = useCallback(() => setDraft(''), []);

  const select = useCallback(
    (sel: Selection) => {
      const params = new URLSearchParams();
      if (shownQuery) params.set('q', shownQuery);
      const [key, value] = selectionParam(sel);
      params.set(key, value);
      router.replace(`/dictionary?${params.toString()}`, { scroll: false });
    },
    [router, shownQuery],
  );

  if (!shownQuery) {
    return (
      <BeforeSearch
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => runTerm(draft)}
        onRun={runTerm}
      />
    );
  }

  // The provider's result belongs to whichever term it last searched. Until
  // that catches up with what we're showing, the rail would be putting the
  // previous query's rows under the new query's heading, so treat the gap as
  // loading.
  const inSync = ranQuery === shownQuery;
  const contents = inSync ? railContents(result) : EMPTY_RAIL;
  const selection = resolveSelection(contents, searchParams.get('kanji'), searchParams.get('id'));

  return (
    <SearchView
      query={shownQuery}
      contents={contents}
      selection={selection}
      onSelect={select}
      loading={loading || !inSync}
      error={inSync ? error : null}
      onRun={runTerm}
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={() => runTerm(draft)}
      onClear={clear}
    />
  );
}
