'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { fetchJson } from '@/lib/api';
import {
  buildReadingCandidates,
  findFirstKanji,
  normalizeReadingSlug,
  toReadingSlugFromInput,
  uniqueValues,
  kanaToRomaji,
} from '@/lib/japanese';

type KanjiResult = {
  kanji: string;
  grade: number | null;
  stroke_count: number;
  meanings: string[];
  kun_readings: string[];
  on_readings: string[];
  name_readings: string[];
  jlpt: number | null;
  unicode: string;
};

type WordVariant = {
  written: string;
  pronounced: string;
  priorities: string[];
};

type WordMeaning = {
  glosses: string[];
};

type WordEntry = {
  variants: WordVariant[];
  meanings: WordMeaning[];
};

type ReadingResult = {
  reading: string;
  main_kanji: string[];
  name_kanji: string[];
};


type RunSearchOptions = {
  preferredReadingSlug?: string;
};

const READING_QUERY_PARAM = 'reading';

function toReadingSlugFromKanjiResult(result: KanjiResult): string {
  const candidates = [...result.kun_readings, ...result.on_readings, ...result.name_readings]
    .map((v) => v.replace(/[\.\-]/g, ''))
    .map((v) => v.replace(/[^\p{Script=Hiragana}\p{Script=Katakana}ー]/gu, ''))
    .filter(Boolean);

  for (const candidate of candidates) {
    const romaji = kanaToRomaji(candidate);
    if (romaji) return romaji;
  }

  return '';
}

async function fetchReadingWithFallback(
  readingCandidates: string[],
  signal: AbortSignal,
): Promise<{ reading: ReadingResult; resolvedReading: string }> {
  let fallbackError: Error | null = null;

  for (const candidate of readingCandidates) {
    try {
      const reading = await fetchJson<ReadingResult>(
        `https://kanjiapi.dev/v1/reading/${encodeURIComponent(candidate)}`,
        signal,
      );
      return { reading, resolvedReading: candidate };
    } catch (error) {
      if (error instanceof Error && error.message.includes('No such endpoint')) {
        fallbackError = error;
        continue;
      }
      throw error;
    }
  }

  if (fallbackError) throw fallbackError;
  throw new Error('No reading match found for this query.');
}

export default function DictionaryView({ storageKey = 'dictionary_state' }: { storageKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedFromUrlRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const storageSaveReadyRef = useRef(false);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReadingSlug, setActiveReadingSlug] = useState('');
  const [kanjiResult, setKanjiResult] = useState<KanjiResult | null>(null);
  const [wordResults, setWordResults] = useState<WordEntry[]>([]);
  const [readingResult, setReadingResult] = useState<ReadingResult | null>(null);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        query?: string;
        kanjiResult?: KanjiResult | null;
        wordResults?: WordEntry[];
        readingResult?: ReadingResult | null;
        activeReadingSlug?: string;
      };
      if (saved.query) setQuery(saved.query);
      if (saved.kanjiResult !== undefined) setKanjiResult(saved.kanjiResult ?? null);
      if (saved.wordResults?.length) setWordResults(saved.wordResults);
      if (saved.readingResult !== undefined) setReadingResult(saved.readingResult ?? null);
      if (saved.activeReadingSlug !== undefined) setActiveReadingSlug(saved.activeReadingSlug);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!storageSaveReadyRef.current) { storageSaveReadyRef.current = true; return; }
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        query, kanjiResult, wordResults, readingResult, activeReadingSlug,
      }));
    } catch { /* ignore */ }
  }, [storageKey, query, kanjiResult, wordResults, readingResult, activeReadingSlug]);

  const clearResults = useCallback(() => {
    setKanjiResult(null);
    setWordResults([]);
    setReadingResult(null);
  }, []);

  const syncReadingInUrl = useCallback(
    (readingSlug: string) => {
      const normalized = normalizeReadingSlug(readingSlug);
      const params = new URLSearchParams(searchParams.toString());

      if (normalized) {
        params.set(READING_QUERY_PARAM, normalized);
      } else {
        params.delete(READING_QUERY_PARAM);
      }

      const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const runSearch = useCallback(
    async (rawQuery: string, options: RunSearchOptions = {}) => {
      const trimmedQuery = rawQuery.trim();
      if (!trimmedQuery) {
        setError('Enter a search value first.');
        clearResults();
        syncReadingInUrl('');
        setActiveReadingSlug('');
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      setLoading(true);
      setError(null);
      clearResults();

      try {
        const kanjiCharacter = findFirstKanji(trimmedQuery);

        if (kanjiCharacter) {
          setQuery(kanjiCharacter);

          const kanji = await fetchJson<KanjiResult>(
            `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanjiCharacter)}`,
            signal,
          );

          let words: WordEntry[] = [];
          try {
            words = await fetchJson<WordEntry[]>(
              `https://kanjiapi.dev/v1/words/${encodeURIComponent(kanjiCharacter)}`,
              signal,
            );
          } catch (wordError) {
            if (!(wordError instanceof Error) || !wordError.message.includes('No such endpoint')) {
              throw wordError;
            }
          }

          setKanjiResult(kanji);
          setWordResults(words);

          const urlReading =
            normalizeReadingSlug(options.preferredReadingSlug || activeReadingSlug) ||
            toReadingSlugFromKanjiResult(kanji);

          setActiveReadingSlug(urlReading);
          syncReadingInUrl(urlReading);
        } else {
          const readingCandidates = buildReadingCandidates(trimmedQuery);
          if (readingCandidates.length === 0) {
            throw new Error('Enter a kanji, kana, or romaji word (examples: 猫, ねこ, ネコ, neko).');
          }

          const { reading, resolvedReading } = await fetchReadingWithFallback(readingCandidates, signal);
          setReadingResult(reading);
          setQuery(resolvedReading);

          const urlReading =
            normalizeReadingSlug(options.preferredReadingSlug || toReadingSlugFromInput(trimmedQuery)) ||
            toReadingSlugFromInput(resolvedReading);

          setActiveReadingSlug(urlReading);
          syncReadingInUrl(urlReading);
        }
      } catch (searchError) {
        if (searchError instanceof Error && searchError.name === 'AbortError') return;
        const message = searchError instanceof Error ? searchError.message : 'Could not fetch data from kanjiapi.dev.';
        setError(message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [activeReadingSlug, clearResults, syncReadingInUrl],
  );

  useEffect(() => {
    if (initializedFromUrlRef.current) return;
    initializedFromUrlRef.current = true;

    const readingFromUrl = normalizeReadingSlug(searchParams.get(READING_QUERY_PARAM) ?? '');
    if (!readingFromUrl) return;

    setQuery(readingFromUrl);
    setActiveReadingSlug(readingFromUrl);
    void runSearch(readingFromUrl, { preferredReadingSlug: readingFromUrl });
  }, [runSearch, searchParams]);

  const submitSearch = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(query);
  };

  const handleKanjiOptionClick = (kanjiCharacter: string) => {
    const preferredReading =
      normalizeReadingSlug(activeReadingSlug) || toReadingSlugFromInput(readingResult?.reading ?? '');
    void runSearch(kanjiCharacter, { preferredReadingSlug: preferredReading });
  };

  const mainKanjiOptions = uniqueValues(readingResult?.main_kanji ?? []);
  const nameKanjiOptions = uniqueValues(readingResult?.name_kanji ?? []);

  return (
    <div className="p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <h1 className="text-xl font-semibold text-lumina-primary-text">Dictionary</h1>

      <form onSubmit={submitSearch} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kanji, kana, or romaji (e.g. 猫 / ねこ / neko)"
          className="w-full max-w-md rounded border border-lumina-border-divider px-3 py-2 text-sm bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-lumina-primary-teal bg-lumina-primary-teal text-black px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-lumina-error">
          {error}
          {' If this is a browser CORS/network issue, then a server proxy would be required.'}
        </p>
      ) : null}

      {kanjiResult ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{kanjiResult.kanji}</span>
            <div className="text-sm text-lumina-secondary-text">
              <div>Unicode: U+{kanjiResult.unicode.toUpperCase()}</div>
              <div>Grade: {kanjiResult.grade ?? '-'}</div>
              <div>JLPT: {kanjiResult.jlpt ?? '-'}</div>
              <div>Strokes: {kanjiResult.stroke_count}</div>
            </div>
          </div>
          <p className="mt-3 text-sm">
            <span className="font-medium">Meanings:</span> {kanjiResult.meanings.join(', ') || '-'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Kun:</span> {kanjiResult.kun_readings.join(', ') || '-'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">On:</span> {kanjiResult.on_readings.join(', ') || '-'}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Name:</span> {kanjiResult.name_readings.join(', ') || '-'}
          </p>
        </section>
      ) : null}

      {wordResults.length > 0 ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <h2 className="text-lg font-medium text-lumina-primary-text">Words ({wordResults.length})</h2>
          <ul className="mt-3 space-y-3">
            {wordResults.slice(0, 10).map((entry, index) => {
              const variantText = entry.variants
                .map((v) => (v.pronounced ? `${v.written} (${v.pronounced})` : v.written))
                .join(' / ');
              const meaningText = entry.meanings
                .map((m) => m.glosses.join(', '))
                .filter(Boolean)
                .join(' • ');

              return (
                <li key={`${variantText}-${index}`} className="border-b border-lumina-border-divider pb-2 text-sm">
                  <p className="font-medium text-lumina-primary-text">{variantText || 'Unknown variant'}</p>
                  <p className="text-lumina-secondary-text">{meaningText || 'No gloss available'}</p>
                </li>
              );
            })}
          </ul>
          {wordResults.length > 10 ? (
            <p className="mt-2 text-xs text-lumina-secondary-text">
              Showing first 10 results to keep the page lightweight.
            </p>
          ) : null}
        </section>
      ) : null}

      {readingResult ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-white p-4">
          <h2 className="text-lg font-medium text-lumina-primary-text">Reading: {readingResult.reading}</h2>
          <p className="mt-2 text-sm text-lumina-secondary-text">Click any kanji option to auto-search its meaning.</p>

          <div className="mt-3">
            <p className="text-sm font-medium">Main kanji</p>
            {mainKanjiOptions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {mainKanjiOptions.map((kanjiCharacter) => (
                  <button
                    key={`main-${kanjiCharacter}`}
                    type="button"
                    onClick={() => handleKanjiOptionClick(kanjiCharacter)}
                    className="rounded border border-lumina-border-divider bg-lumina-app-background px-4 py-2 text-base"
                  >
                    {kanjiCharacter}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-lumina-secondary-text">-</p>
            )}
          </div>

          <div className="mt-3">
            <p className="text-sm font-medium">Name kanji</p>
            {nameKanjiOptions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {nameKanjiOptions.map((kanjiCharacter) => (
                  <button
                    key={`name-${kanjiCharacter}`}
                    type="button"
                    onClick={() => handleKanjiOptionClick(kanjiCharacter)}
                    className="rounded border border-lumina-border-divider bg-lumina-app-background px-4 py-2 text-base"
                  >
                    {kanjiCharacter}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-lumina-secondary-text">-</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
