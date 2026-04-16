'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReaderState } from '@/components/providers/ReaderStateProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

type WordMeaning = { meaning: string; pos: string | null; lang: string };

type WordResult = {
  id: number;
  is_common: boolean;
  grade: number | null;
  char_grades: { char: string; grade: number | null }[];
  kanji: string[];
  readings: string[];
  meanings: WordMeaning[];
};

type KanjiInfo = {
  literal: string;
  grade: number | null;
  stroke_count: number | null;
  radical: number | null;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
};

type NameResult = {
  id: number;
  kanji: string | null;
  kana: string;
  name_type: string[];
  translations: string[];
};

type SearchResponse =
  | { type: 'kanji'; kanji: KanjiInfo | null; words: WordResult[]; names: NameResult[] }
  | { type: 'word'; words: WordResult[] }
  | { type: 'kana'; words: WordResult[]; names: NameResult[]; kanjis: KanjiInfo[] }
  | { type: 'meaning'; words: WordResult[] };

// ── API call ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function queryDictionary(q: string, signal: AbortSignal): Promise<SearchResponse> {
  const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Search failed');
  }
  return res.json() as Promise<SearchResponse>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DictionaryView({ storageKey = 'dictionary_state' }: { storageKey?: string }) {
  const { pendingDictSearch, setPendingDictSearch } = useReaderState();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q');
  const abortRef = useRef<AbortController | null>(null);
  const saveReadyRef = useRef(false);
  const lastUrlQueryRef = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  // Persist / restore state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { query?: string; result?: SearchResponse };
      if (saved.query) setQuery(saved.query);
      if (saved.result) setResult(saved.result);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!saveReadyRef.current) {
      saveReadyRef.current = true;
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify({ query, result }));
    } catch {
      /* ignore */
    }
  }, [storageKey, query, result]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      setError('Enter a search term first.');
      setResult(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await queryDictionary(q, controller.signal);
      setResult(data);
      setQuery(q);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Triggered by epub reader click-to-search
  useEffect(() => {
    if (!pendingDictSearch) return;
    setQuery(pendingDictSearch);
    void runSearch(pendingDictSearch);
    setPendingDictSearch(null);
  }, [pendingDictSearch, setPendingDictSearch, runSearch]);

  // Triggered by kanji chip links from the word detail page (/dictionary?q=…).
  // Only fires once per unique URL query, so returning to the tab later
  // doesn't clobber the user's in-progress search.
  useEffect(() => {
    if (!urlQuery) return;
    if (lastUrlQueryRef.current === urlQuery) return;
    lastUrlQueryRef.current = urlQuery;
    setQuery(urlQuery);
    void runSearch(urlQuery);
  }, [urlQuery, runSearch]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void runSearch(query);
  };

  // Derived helpers
  const words = result ? ('words' in result ? result.words : []) : [];
  const names = result && 'names' in result ? result.names : [];
  const kanjiInfo = result?.type === 'kanji' ? result.kanji : null;

  return (
    <div className="p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <h1 className="text-xl font-semibold text-lumina-primary-text">Dictionary</h1>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kanji, kana, or English (e.g. 食べる / たべる / eat)"
          className="w-full max-w-md rounded border border-lumina-border-divider px-3 py-2 text-sm bg-lumina-surface-background"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-lumina-primary-teal bg-lumina-primary-teal text-black px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-lumina-error">{error}</p> : null}

      {/* Kanji panel */}
      {kanjiInfo ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-lumina-surface-background p-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{kanjiInfo.literal}</span>
            <div className="text-sm text-lumina-secondary-text space-y-0.5">
              <div>Grade: {kanjiInfo.grade ?? '—'}</div>
              <div>Strokes: {kanjiInfo.stroke_count ?? '—'}</div>
              <div>Radical: {kanjiInfo.radical ?? '—'}</div>
            </div>
          </div>
          <p className="mt-3 text-sm">
            <span className="font-medium">Meanings: </span>
            {kanjiInfo.meanings.join(', ') || '—'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">On: </span>
            {kanjiInfo.on_readings.join('、') || '—'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Kun: </span>
            {kanjiInfo.kun_readings.join('、') || '—'}
          </p>
        </section>
      ) : null}

      {/* Words panel */}
      {words.length > 0 ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-lumina-surface-background p-4">
          <h2 className="text-lg font-medium text-lumina-primary-text">Words ({words.length})</h2>
          <ul className="mt-3 space-y-3">
            {words.slice(0, 15).map((word) => {
              const headword = word.kanji[0] ?? word.readings[0] ?? '—';
              const reading = word.kanji.length > 0 ? word.readings[0] : null;
              const glosses = word.meanings
                .filter((m: WordMeaning) => m.lang === 'eng')
                .map((m: WordMeaning) => m.meaning)
                .join(' · ');
              const pos = word.meanings[0]?.pos;

              return (
                <li
                  key={word.id}
                  className="border-b border-lumina-border-divider last:border-0 text-sm"
                >
                  <Link
                    href={`/word/${word.id}`}
                    className="block py-2 -mx-2 px-2 rounded hover:bg-lumina-primary-text/5 transition"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-lumina-primary-text text-base">{headword}</span>
                      {reading ? <span className="text-lumina-secondary-text text-xs">{reading}</span> : null}
                      {word.grade != null ? (
                        <span className="text-xs text-lumina-secondary-text">G{word.grade}</span>
                      ) : null}
                      {word.is_common ? <span className="ml-auto text-xs text-lumina-primary-teal">common</span> : null}
                    </div>
                    {pos ? <p className="text-xs text-lumina-secondary-text italic">{pos}</p> : null}
                    <p className="text-lumina-secondary-text">{glosses || '—'}</p>
                    {word.char_grades?.length > 1 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {word.char_grades.map(({ char, grade }: { char: string; grade: number | null }) => (
                          <span
                            key={char}
                            className="inline-flex items-center gap-1 rounded border border-lumina-border-divider px-1.5 py-0.5 text-xs text-lumina-secondary-text"
                          >
                            <span className="font-medium text-lumina-primary-text">{char}</span>
                            <span className="opacity-60">{grade != null ? `G${grade}` : '—'}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {words.length > 15 ? (
            <p className="mt-2 text-xs text-lumina-secondary-text">Showing first 15 of {words.length} results.</p>
          ) : null}
        </section>
      ) : null}

      {/* Names panel */}
      {names.length > 0 ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-lumina-surface-background p-4">
          <h2 className="text-lg font-medium text-lumina-primary-text">Names ({names.length})</h2>
          <ul className="mt-3 space-y-2">
            {names.slice(0, 10).map((name) => (
              <li key={name.id} className="border-b border-lumina-border-divider pb-2 last:border-0 last:pb-0 text-sm">
                <span className="font-medium text-lumina-primary-text">{name.kanji ?? name.kana}</span>
                {name.kanji ? <span className="ml-2 text-xs text-lumina-secondary-text">{name.kana}</span> : null}
                {name.name_type.length > 0 ? (
                  <span className="ml-2 text-xs italic text-lumina-secondary-text">{name.name_type.join(', ')}</span>
                ) : null}
                {name.translations.length > 0 ? (
                  <p className="text-lumina-secondary-text">{name.translations.join('; ')}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Empty state */}
      {!loading && !error && result && words.length === 0 && names.length === 0 && !kanjiInfo ? (
        <p className="mt-4 text-sm text-lumina-secondary-text">No results found.</p>
      ) : null}
    </div>
  );
}
