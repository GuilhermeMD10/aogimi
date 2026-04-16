'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type WordMeaning = { meaning: string; pos: string | null; lang: string };

type WordResult = {
  id: number;
  is_common: boolean;
  kanji: string[];
  readings: string[];
  meanings: WordMeaning[];
  grade?: number | null;
  char_grades?: { char: string; grade: number | null }[];
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

type DetailsResponse = { word: WordResult; kanjis: KanjiInfo[] };

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function WordDetailView({ id }: { id: string }) {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const [data, setData] = useState<DetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setData(null);

    fetch(`${API}/api/words/${encodeURIComponent(id)}/details`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load word');
        }
        return res.json() as Promise<DetailsResponse>;
      })
      .then(setData)
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load word');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  const searchKanji = (char: string) => {
    router.push(`/dictionary?q=${encodeURIComponent(char)}`);
  };

  return (
    <div className="p-6 rounded-2xl bg-lumina-app-background min-h-full w-full">
      <div className="flex items-center gap-3">
        <Link
          href="/dictionary"
          className="text-xs text-lumina-secondary-text hover:text-lumina-primary-text"
        >
          ← Back to dictionary
        </Link>
      </div>

      {loading ? <p className="mt-4 text-sm text-lumina-secondary-text">Loading…</p> : null}
      {error ? <p className="mt-4 text-sm text-lumina-error">{error}</p> : null}

      {data ? <WordBody data={data} onKanjiClick={searchKanji} /> : null}
    </div>
  );
}

function WordBody({
  data,
  onKanjiClick,
}: {
  data: DetailsResponse;
  onKanjiClick: (char: string) => void;
}) {
  const { word, kanjis } = data;
  const headword = word.kanji[0] ?? word.readings[0] ?? '—';
  const altKanji = word.kanji.slice(1);

  return (
    <>
      <section className="mt-3 rounded border border-lumina-border-divider bg-lumina-surface-background p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-4xl font-semibold text-lumina-primary-text">{headword}</h1>
          {word.readings.length > 0 ? (
            <span className="text-lg text-lumina-secondary-text">
              {word.readings.join('、')}
            </span>
          ) : null}
          {word.is_common ? (
            <span className="ml-auto text-xs text-lumina-primary-teal">common</span>
          ) : null}
        </div>

        {altKanji.length > 0 ? (
          <p className="mt-2 text-sm text-lumina-secondary-text">
            <span className="font-medium">Also written: </span>
            {altKanji.join('、')}
          </p>
        ) : null}

        <div className="mt-4">
          <h2 className="text-sm font-medium text-lumina-primary-text">Meanings</h2>
          {word.meanings.length > 0 ? (
            <ol className="mt-2 space-y-1 text-sm text-lumina-primary-text list-decimal list-inside">
              {word.meanings.map((m, i) => (
                <li key={`${m.lang}-${i}`}>
                  <span>{m.meaning}</span>
                  {m.pos ? (
                    <span className="ml-2 text-xs italic text-lumina-secondary-text">
                      {m.pos}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-lumina-secondary-text">—</p>
          )}
        </div>
      </section>

      {kanjis.length > 0 ? (
        <section className="mt-4 rounded border border-lumina-border-divider bg-lumina-surface-background p-5">
          <h2 className="text-lg font-medium text-lumina-primary-text">
            Kanji breakdown ({kanjis.length})
          </h2>
          <p className="text-xs text-lumina-secondary-text">
            Click a character to search for it.
          </p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kanjis.map((k) => (
              <li key={k.literal}>
                <button
                  type="button"
                  onClick={() => onKanjiClick(k.literal)}
                  className="w-full text-left rounded border border-lumina-border-divider p-3 hover:bg-lumina-primary-text/5 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl text-lumina-primary-text">{k.literal}</span>
                    <div className="text-xs text-lumina-secondary-text space-y-0.5">
                      <div>Grade: {k.grade ?? '—'}</div>
                      <div>Strokes: {k.stroke_count ?? '—'}</div>
                      <div>Radical: {k.radical ?? '—'}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-lumina-primary-text">
                    {k.meanings.join(', ') || '—'}
                  </p>
                  <p className="mt-1 text-xs text-lumina-secondary-text">
                    <span className="font-medium">On: </span>
                    {k.on_readings.join('、') || '—'}
                  </p>
                  <p className="text-xs text-lumina-secondary-text">
                    <span className="font-medium">Kun: </span>
                    {k.kun_readings.join('、') || '—'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
