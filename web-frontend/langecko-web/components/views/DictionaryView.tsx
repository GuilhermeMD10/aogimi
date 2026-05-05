'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Plus, Volume2 } from 'lucide-react';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import WordDetailView, { preferredHeadword } from '@/components/views/WordDetailView';

// ── Types ─────────────────────────────────────────────────────────────────────

type WordMeaning = { meaning: string; pos: string | null; lang: string };

type WordResult = {
  id: number;
  is_common: boolean;
  jlpt_level: number | null;
  grade: number | null;
  char_grades: { char: string; grade: number | null }[];
  kanji: string[];
  readings: string[];
  meanings: WordMeaning[];
};

type KanjiInfo = {
  literal: string;
  grade: number | null;
  jlpt_level: number | null;
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

// ── Result ordering ──────────────────────────────────────────────────────────

/** Mean grade of the kanji in a word (lower = simpler → ranks higher).
 *  Words without per-character grades fall back to 0 (kana-only / trivial),
 *  pushing them to the top. Used purely for ordering — never displayed. */
function meanWordGrade(word: WordResult): number {
  const grades = (word.char_grades ?? [])
    .map((c) => c.grade)
    .filter((g): g is number => g != null);
  if (grades.length > 0) return grades.reduce((a, b) => a + b, 0) / grades.length;
  return 0;
}

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
  const { pendingDictSearch, setPendingDictSearch, setPendingCard } = useReaderState();
  const { theme } = useTheme();
  const isStamp = theme === 'stamp';
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q');
  const abortRef = useRef<AbortController | null>(null);
  const saveReadyRef = useRef(false);
  const lastUrlQueryRef = useRef<string | null>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [lastContextSentence, setLastContextSentence] = useState<string | undefined>(undefined);

  // Persist / restore state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { query?: string; result?: SearchResponse; selectedWordId?: number | null };
      if (saved.query) setQuery(saved.query);
      if (saved.result) setResult(saved.result);
      if (saved.selectedWordId != null) setSelectedWordId(saved.selectedWordId);
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
      localStorage.setItem(storageKey, JSON.stringify({ query, result, selectedWordId }));
    } catch {
      /* ignore */
    }
  }, [storageKey, query, result, selectedWordId]);

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

  useEffect(() => {
    if (!pendingDictSearch) return;
    setSelectedWordId(null);
    setQuery(pendingDictSearch.word);
    setLastContextSentence(pendingDictSearch.contextSentence);
    void runSearch(pendingDictSearch.word);
    setPendingDictSearch(null);
  }, [pendingDictSearch, setPendingDictSearch, runSearch]);

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

  const rawWords = result ? ('words' in result ? result.words : []) : [];
  // Sort by mean kanji grade (simpler words first). Stable sort preserves the
  // dictionary's relevance ranking inside each grade tier.
  const words = [...rawWords].sort((a, b) => meanWordGrade(a) - meanWordGrade(b));
  const names = result && 'names' in result ? result.names : [];
  const kanjiInfo = result?.type === 'kanji' ? result.kanji : null;

  if (selectedWordId !== null) {
    return (
      <WordDetailView
        id={String(selectedWordId)}
        query={query}
        onBack={() => setSelectedWordId(null)}
        onKanjiSearch={(char) => {
          setSelectedWordId(null);
          setQuery(char);
          void runSearch(char);
        }}
        onAddCard={(word, back) => setPendingCard({ word, back, contextSentence: lastContextSentence })}
      />
    );
  }

  return (
    <div className="@container flex min-h-full w-full flex-col">
      {/* ── Search bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-3 py-2.5 @md:px-5 @md:py-3"
        style={{
          background: isStamp
            ? 'var(--lgc-bg-elev)'
            : 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: isStamp ? 'none' : 'blur(10px)',
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 items-center gap-2 border border-lgc-border-strong bg-lgc-bg-elev px-3 py-2"
          style={{ maxWidth: 540, borderRadius: isStamp ? 0 : 8 }}
        >
          <Search size={14} className="shrink-0 text-lgc-fg-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kanji, kana, or English..."
            className="flex-1 border-none bg-transparent text-[15px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
            style={{ fontFamily: 'var(--lgc-font-display)' }}
          />
          <kbd
            className="border border-lgc-border-strong px-1.5 py-0.5 text-[10px] text-lgc-fg-muted"
            style={{
              fontFamily: 'var(--lgc-font-mono)',
              borderRadius: isStamp ? 0 : 3,
            }}
          >
            {'\u2318'}K
          </kbd>
        </form>
        <div className="ml-auto flex gap-1">
          <button
            type="submit"
            form=""
            onClick={() => void runSearch(query)}
            disabled={loading}
            className="px-2.5 py-1.5 text-xs font-medium text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev disabled:opacity-50"
            style={{
              borderRadius: isStamp ? 0 : 6,
              fontFamily: isStamp ? 'var(--lgc-font-mono)' : undefined,
              letterSpacing: isStamp ? '0.18em' : undefined,
              textTransform: isStamp ? 'uppercase' : undefined,
            }}
          >
            {loading ? 'Searching\u2026' : 'JA \u2192 EN'}
          </button>
        </div>
      </div>

      {/* ── Results area ───────────────────────────────────────────── */}
      <div className="lgc-scroll flex-1 overflow-auto">
        {error && <p className="px-5 py-3 text-sm text-lgc-error">{error}</p>}

        {/* Kanji info panel */}
        {kanjiInfo && (
          <KanjiPanel
            kanji={kanjiInfo}
            isStamp={isStamp}
            onAddCard={() => {
              const parts: string[] = [];
              if (kanjiInfo.on_readings.length > 0) parts.push(kanjiInfo.on_readings.join('\u3001'));
              if (kanjiInfo.kun_readings.length > 0) parts.push(kanjiInfo.kun_readings.join('\u3001'));
              if (kanjiInfo.meanings.length > 0) parts.push(kanjiInfo.meanings.join(', '));
              setPendingCard({ word: kanjiInfo.literal, back: parts.join('\n'), contextSentence: lastContextSentence });
            }}
          />
        )}

        {/* Word results */}
        {words.length > 0 && (
          <>
            <div className="px-3 pb-1.5 pt-4 @md:px-5 @md:pt-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-accent">
                Dictionary
              </div>
              <div
                className="mt-1 text-[16px] font-medium tracking-tight text-lgc-fg @sm:text-[18px] @lg:text-[22px]"
                style={{ fontFamily: 'var(--lgc-font-display)', letterSpacing: '-0.01em' }}
              >
                {words.length} result{words.length !== 1 ? 's' : ''} for{' '}
                <span className="text-lgc-accent">{'\u300C'}{query}{'\u300D'}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between px-3 pb-3 @md:px-5">
              <span className="text-xs text-lgc-fg-muted">
                Showing JMdict entries &middot; kanji, reading, and cross-reference matches
              </span>
              <span
                className="text-[11px] text-lgc-fg-muted"
                style={{ fontFamily: 'var(--lgc-font-mono)' }}
              >
                sort &middot; relevance &darr;
              </span>
            </div>

            <div className="border-t border-lgc-border">
              {words.slice(0, 15).map((word, i) => (
                <ResultRow
                  key={word.id}
                  word={word}
                  index={i}
                  active={i === 0}
                  query={query}
                  isStamp={isStamp}
                  onClick={() => setSelectedWordId(word.id)}
                />
              ))}
            </div>

            {words.length > 15 && (
              <p className="px-5 py-3 text-xs text-lgc-fg-muted">
                Showing first 15 of {words.length} results.
              </p>
            )}
            <div className="py-5 text-center text-xs text-lgc-fg-subtle">End of results</div>
          </>
        )}

        {/* Name results */}
        {names.length > 0 && (
          <div className="px-3 pb-6 @md:px-5">
            <SectionHead num="02" title="Names" isStamp={isStamp} />
            <div
              className="overflow-hidden border border-lgc-border"
              style={{ borderRadius: isStamp ? 0 : 8 }}
            >
              {names.slice(0, 10).map((name) => (
                <div
                  key={name.id}
                  className="border-b border-lgc-border px-4 py-2.5 text-sm last:border-0"
                >
                  <span
                    className="font-medium text-lgc-fg"
                    style={{ fontFamily: 'var(--lgc-font-display)' }}
                  >
                    {name.kanji ?? name.kana}
                  </span>
                  {name.kanji && (
                    <span className="ml-2 text-xs text-lgc-fg-muted">{name.kana}</span>
                  )}
                  {name.name_type.length > 0 && (
                    <span className="ml-2 text-xs italic text-lgc-fg-subtle">
                      {name.name_type.join(', ')}
                    </span>
                  )}
                  {name.translations.length > 0 && (
                    <p className="text-lgc-fg-muted">{name.translations.join('; ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && result && words.length === 0 && names.length === 0 && !kanjiInfo && (
          <p className="px-5 py-6 text-sm text-lgc-fg-muted">No results found.</p>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultRow({
  word,
  index,
  active,
  query,
  isStamp,
  onClick,
}: {
  word: WordResult;
  index: number;
  active: boolean;
  query: string;
  isStamp: boolean;
  onClick: () => void;
}) {
  const headword = preferredHeadword(word, query);
  const reading = word.kanji.length > 0 ? word.readings[0] : null;
  const glosses = word.meanings.filter((m) => m.lang === 'eng').map((m) => m.meaning);
  const pos = word.meanings[0]?.pos;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-2.5 border-b border-lgc-border px-3 py-3 text-left transition-colors hover:bg-lgc-bg-elev @md:gap-4 @md:px-5 @md:py-4"
      style={{
        background: active ? 'var(--lgc-bg-elev)' : undefined,
        borderLeft: active ? '2px solid var(--lgc-accent)' : '2px solid transparent',
        borderBottomStyle: isStamp ? 'dashed' : 'solid',
      }}
    >
      {/* Row number — vermillion mono under stamp */}
      <div
        className="hidden min-w-4.5 pt-1.5 text-[11px] @sm:block"
        style={{
          fontFamily: 'var(--lgc-font-mono)',
          color: isStamp ? 'var(--lgc-accent)' : 'var(--lgc-fg-subtle)',
          letterSpacing: isStamp ? '0.18em' : undefined,
          fontWeight: isStamp ? 500 : undefined,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Headword + reading */}
      <div className="min-w-0 shrink-0 text-left @sm:min-w-20 @lg:min-w-30">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[20px] leading-none tracking-tight text-lgc-fg @sm:text-[24px] @lg:text-[30px]"
            style={{ fontFamily: 'var(--lgc-font-display)', letterSpacing: '-0.01em' }}
          >
            {headword}
          </span>
          {word.is_common && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 bg-lgc-accent"
              style={{ borderRadius: isStamp ? 0 : '50%' }}
              title="Common"
            />
          )}
        </div>
        {reading && (
          <div
            className="mt-1 text-[13px]"
            style={{
              fontFamily: 'var(--lgc-font-display)',
              color: isStamp ? 'var(--lgc-accent)' : 'var(--lgc-fg-muted)',
              letterSpacing: isStamp ? '0.04em' : undefined,
            }}
          >
            {reading}
          </div>
        )}
      </div>

      {/* Chips + glosses */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {pos && <span className="lgc-chip">{pos}</span>}
          {word.jlpt_level != null && <JlptChip level={word.jlpt_level} />}
          {word.char_grades?.length > 1 &&
            word.char_grades.map(({ char, grade }) => (
              <span key={char} className="lgc-chip">
                {char}
                {grade != null ? ` G${grade}` : ''}
              </span>
            ))}
        </div>
        {glosses.length > 0 && (
          <ol className="list-decimal pl-4.5 text-[13.5px] leading-relaxed text-lgc-fg">
            {glosses.map((g, gi) => (
              <li key={gi} className="mb-0.5">
                {g}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Action icons */}
      <div className="hidden shrink-0 flex-col items-end gap-1 @md:flex">
        <span
          className="border border-lgc-border p-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
          style={{ borderRadius: isStamp ? 0 : 6 }}
          title="Add to flashcards"
        >
          <Plus size={14} />
        </span>
        <span
          className="border border-lgc-border p-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
          style={{ borderRadius: isStamp ? 0 : 6 }}
          title="Audio"
        >
          <Volume2 size={14} />
        </span>
      </div>
    </button>
  );
}

function KanjiPanel({
  kanji,
  isStamp,
  onAddCard,
}: {
  kanji: KanjiInfo;
  isStamp: boolean;
  onAddCard?: () => void;
}) {
  return (
    <div
      className="mx-3 mt-4 flex flex-col gap-3 border border-lgc-border bg-lgc-bg-elev p-4 @sm:mx-5 @sm:mt-5 @sm:flex-row @sm:gap-4 @sm:p-5"
      style={{
        borderRadius: isStamp ? 0 : 8,
        boxShadow: isStamp ? '3px 3px 0 var(--lgc-fg)' : undefined,
      }}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center text-[48px] leading-none text-lgc-fg @sm:h-22 @sm:w-22 @sm:border-r @sm:border-lgc-border @sm:pr-3 @sm:text-[72px]"
        style={{ fontFamily: 'var(--lgc-font-display)' }}
      >
        {kanji.literal}
      </div>
      <div className="flex-1 text-[12.5px] leading-relaxed">
        <div
          className="mb-1 text-[15px] font-medium"
          style={{
            fontFamily: 'var(--lgc-font-display)',
            color: isStamp ? 'var(--lgc-accent)' : 'var(--lgc-fg)',
            fontSize: isStamp ? 16 : undefined,
          }}
        >
          {kanji.meanings.join(', ') || '\u2014'}
        </div>
        <InfoRow label="On" value={kanji.on_readings.join('\u3001') || '\u2014'} jp />
        <InfoRow label="Kun" value={kanji.kun_readings.join('\u3001') || '\u2014'} jp />
        <InfoRow label="Strokes" value={String(kanji.stroke_count ?? '\u2014')} />
        <InfoRow label="Grade" value={kanji.grade != null ? String(kanji.grade) : '\u2014'} />
        <InfoRow label="JLPT" value={kanji.jlpt_level != null ? `N${kanji.jlpt_level}` : '\u2014'} />
        <InfoRow label="Radical" value={kanji.radical != null ? String(kanji.radical) : '\u2014'} />
        {onAddCard && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddCard(); }}
            className="mt-2 flex items-center gap-1.5 bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
            style={{
              borderRadius: isStamp ? 0 : 6,
              border: isStamp ? '1px solid var(--lgc-fg)' : undefined,
              boxShadow: isStamp ? '2px 2px 0 var(--lgc-fg)' : undefined,
              fontFamily: isStamp ? 'var(--lgc-font-display)' : undefined,
              letterSpacing: isStamp ? '0.04em' : undefined,
            }}
          >
            <Plus size={13} /> Add to deck
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHead({ num, title, isStamp }: { num: string; title: string; isStamp: boolean }) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span
        className="text-[11px] font-semibold"
        style={{
          fontFamily: 'var(--lgc-font-mono)',
          color: isStamp ? 'var(--lgc-accent)' : 'var(--lgc-fg-subtle)',
          letterSpacing: isStamp ? '0.2em' : undefined,
        }}
      >
        {num}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lgc-accent">
        {title}
      </span>
      <span className="h-px flex-1 bg-lgc-border" />
    </div>
  );
}

function InfoRow({ label, value, jp }: { label: string; value: string; jp?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <span className="w-16 text-[11px] font-semibold uppercase tracking-[0.06em] text-lgc-fg-muted">
        {label}
      </span>
      <span
        className="text-[13px] text-lgc-fg"
        style={{
          fontFamily: jp ? 'var(--lgc-font-display)' : 'var(--lgc-font-mono)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// Per-level palette: warmer for easier (N5), cooler for harder (N1). The
// values land on the same `--lgc-accent` family the rest of the chrome uses,
// just shifted around the color wheel — the chip stays tonally consistent
// with grade chips next to it.
const JLPT_PALETTE: Record<number, string> = {
  5: '#8FB08A', // green   — N5 (easiest)
  4: '#B5A27C', // sand
  3: '#D9A557', // amber
  2: '#D97757', // accent  — orange
  1: '#A05C7B', // plum    — N1 (hardest)
};

export function JlptChip({ level }: { level: number }) {
  const color = JLPT_PALETTE[level] ?? 'var(--lgc-fg-muted)';
  return (
    <span
      className="lgc-chip"
      style={{
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        color,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
      title={`JLPT N${level}`}
    >
      N{level}
    </span>
  );
}
