'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import * as decksApi from '@/lib/decksApi';
import type { DeckRecord } from '@/lib/decksApi';

// ── Types (matching backend search / details responses) ─────────────────────

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

type DetailsResponse = { word: WordResult; kanjis: KanjiInfo[] };

// ── API helpers ─────────────────────────────────────────────────────────────

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

async function fetchWordDetails(id: number, signal: AbortSignal): Promise<DetailsResponse> {
  const res = await fetch(`${API}/api/words/${id}/details`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Failed to load word');
  }
  return res.json() as Promise<DetailsResponse>;
}

// ── Phase types ─────────────────────────────────────────────────────────────

type Phase =
  | { type: 'search' }
  | { type: 'word-detail'; wordId: number }
  | { type: 'select-deck'; word: string; back: string; wordId: number | null }
  | { type: 'create-card'; word: string; back: string; deckId: string; deckName: string; wordId: number | null };

// ── ReaderBubble ────────────────────────────────────────────────────────────

interface ReaderBubbleProps {
  initialWord: string;
  contextSentence?: string;
  startAtAddCard?: boolean;
  initialBack?: string;
  onClose: () => void;
}

export default function ReaderBubble({ initialWord, contextSentence, startAtAddCard, initialBack, onClose }: ReaderBubbleProps) {
  const [phase, setPhase] = useState<Phase>(
    startAtAddCard
      ? { type: 'select-deck', word: initialWord, back: initialBack ?? '', wordId: null }
      : { type: 'search' },
  );
  const [query, setQuery] = useState(initialWord);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleScrimClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const data = await queryDictionary(trimmed, controller.signal);
      setSearchResult(data);
      setQuery(trimmed);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSearchError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      if (!controller.signal.aborted) setSearchLoading(false);
    }
  }, []);

  useEffect(() => { void runSearch(initialWord); }, [initialWord, runSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhase({ type: 'search' });
    void runSearch(query);
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 animate-[fade-in_180ms_ease-out]"
        onClick={handleScrimClick}
        style={{
          background: 'rgba(20,16,12,0.06)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Bubble */}
      <div
        className="fixed z-50 flex flex-col overflow-hidden animate-[bubble-enter_180ms_ease-out]"
        style={{
          width: 880,
          height: 620,
          bottom: 82,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--lgc-bg-elev)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        }}
      >
        {phase.type === 'search' && (
          <SearchPhase
            query={query}
            setQuery={setQuery}
            result={searchResult}
            loading={searchLoading}
            error={searchError}
            onSubmit={handleSearchSubmit}
            onWordClick={(id) => setPhase({ type: 'word-detail', wordId: id })}
            onAddKanjiCard={(word, back) =>
              setPhase({ type: 'select-deck', word, back, wordId: null })
            }
            onClose={onClose}
          />
        )}
        {phase.type === 'word-detail' && (
          <WordDetailPhase
            wordId={phase.wordId}
            onBack={() => setPhase({ type: 'search' })}
            onAddCard={(word, back) =>
              setPhase({ type: 'select-deck', word, back, wordId: phase.wordId })
            }
            onKanjiSearch={(char) => {
              setQuery(char);
              setPhase({ type: 'search' });
              void runSearch(char);
            }}
            onClose={onClose}
          />
        )}
        {phase.type === 'select-deck' && (
          <SelectDeckPhase
            word={phase.word}
            onBack={() =>
              phase.wordId != null
                ? setPhase({ type: 'word-detail', wordId: phase.wordId })
                : setPhase({ type: 'search' })
            }
            onSelectDeck={(id, name) =>
              setPhase({
                type: 'create-card',
                word: phase.word,
                back: phase.back,
                deckId: id,
                deckName: name,
                wordId: phase.wordId,
              })
            }
            onClose={onClose}
          />
        )}
        {phase.type === 'create-card' && (
          <CreateCardPhase
            word={phase.word}
            initialBack={phase.back}
            initialContext={contextSentence}
            deckId={phase.deckId}
            deckName={phase.deckName}
            onBack={() =>
              setPhase({ type: 'select-deck', word: phase.word, back: phase.back, wordId: phase.wordId })
            }
            onCreated={onClose}
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}

// ── Search phase ────────────────────────────────────────────────────────────

function SearchPhase({
  query,
  setQuery,
  result,
  loading,
  error,
  onSubmit,
  onWordClick,
  onAddKanjiCard,
  onClose,
}: {
  query: string;
  setQuery: (q: string) => void;
  result: SearchResponse | null;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onWordClick: (id: number) => void;
  onAddKanjiCard: (word: string, back: string) => void;
  onClose: () => void;
}) {
  const words = result ? ('words' in result ? result.words : []) : [];
  const kanjiInfo = result?.type === 'kanji' ? result.kanji : null;

  return (
    <>
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-4 py-2.5"
        style={{
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <form
          onSubmit={onSubmit}
          className="flex flex-1 items-center gap-2 rounded-lg border border-lgc-border-strong bg-lgc-bg px-3 py-2"
          style={{ maxWidth: 540 }}
        >
          <Search size={14} className="shrink-0 text-lgc-fg-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kanji, kana, or English..."
            className="flex-1 border-none bg-transparent text-[15px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
            style={{ fontFamily: 'var(--font-display)' }}
            autoFocus
          />
        </form>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
        >
          <X size={14} /> Close
        </button>
      </div>

      <div className="lgc-scroll flex-1 overflow-auto">
        {loading && <p className="px-5 py-4 text-sm text-lgc-fg-muted">Searching&hellip;</p>}
        {error && <p className="px-5 py-3 text-sm text-lgc-error">{error}</p>}

        {kanjiInfo && (
          <KanjiPanel
            kanji={kanjiInfo}
            onAddCard={() => {
              const parts: string[] = [];
              if (kanjiInfo.on_readings.length > 0) parts.push(kanjiInfo.on_readings.join('\u3001'));
              if (kanjiInfo.kun_readings.length > 0) parts.push(kanjiInfo.kun_readings.join('\u3001'));
              if (kanjiInfo.meanings.length > 0) parts.push(kanjiInfo.meanings.join(', '));
              onAddKanjiCard(kanjiInfo.literal, parts.join('\n'));
            }}
          />
        )}

        {words.length > 0 && (
          <>
            <div className="px-4 pb-1.5 pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-accent">
                Dictionary
              </div>
              <div
                className="mt-1 text-[16px] font-medium tracking-tight text-lgc-fg"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
              >
                {words.length} result{words.length !== 1 ? 's' : ''} for{' '}
                <span className="text-lgc-accent">
                  {'\u300C'}
                  {query}
                  {'\u300D'}
                </span>
              </div>
            </div>
            <div className="border-t border-lgc-border">
              {words.slice(0, 15).map((word, i) => (
                <ResultRow
                  key={word.id}
                  word={word}
                  index={i}
                  active={i === 0}
                  onClick={() => onWordClick(word.id)}
                />
              ))}
            </div>
            {words.length > 15 && (
              <p className="px-5 py-3 text-xs text-lgc-fg-muted">
                Showing first 15 of {words.length} results.
              </p>
            )}
          </>
        )}

        {!loading && !error && result && words.length === 0 && !kanjiInfo && (
          <p className="px-5 py-6 text-sm text-lgc-fg-muted">No results found.</p>
        )}
      </div>
    </>
  );
}

// ── Word detail phase ───────────────────────────────────────────────────────

function WordDetailPhase({
  wordId,
  onBack,
  onAddCard,
  onKanjiSearch,
  onClose,
}: {
  wordId: number;
  onBack: () => void;
  onAddCard: (word: string, back: string) => void;
  onKanjiSearch: (char: string) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<DetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchWordDetails(wordId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load word');
        setLoading(false);
      });

    return () => controller.abort();
  }, [wordId]);

  const handleAddCard = () => {
    if (!data) return;
    const { word, kanjis } = data;
    const headword = word.kanji[0] ?? word.readings[0] ?? '\u2014';
    const reading = word.readings[0];
    const engMeanings = word.meanings.filter((m) => m.lang === 'eng');

    const parts: string[] = [];
    if (reading) parts.push(reading);
    if (kanjis.length > 0) {
      const kanjiLines = kanjis.map((k) => {
        const readings: string[] = [];
        if (k.on_readings.length > 0) readings.push(k.on_readings.join('\u3001'));
        if (k.kun_readings.length > 0) readings.push(k.kun_readings.join('\u3001'));
        return `${k.literal} [${readings.join(' / ')}]`;
      });
      parts.push(kanjiLines.join('\n'));
    }
    if (engMeanings.length > 0) {
      parts.push(engMeanings.map((m, i) => `${i + 1}. ${m.meaning}`).join('\n'));
    }
    onAddCard(headword, parts.join('\n'));
  };

  return (
    <>
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-4 py-2.5"
        style={{
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
        >
          <ArrowLeft size={14} /> Results
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>

      <div className="lgc-scroll flex-1 overflow-auto">
        <div className="mx-auto max-w-170 px-6 pb-8 pt-5">
          {loading && <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
          {error && <p className="text-sm text-lgc-error">{error}</p>}
          {data && (
            <WordDetailContent
              data={data}
              onKanjiSearch={onKanjiSearch}
              onAddCard={handleAddCard}
            />
          )}
        </div>
      </div>
    </>
  );
}

function WordDetailContent({
  data,
  onKanjiSearch,
  onAddCard,
}: {
  data: DetailsResponse;
  onKanjiSearch: (char: string) => void;
  onAddCard: () => void;
}) {
  const { word, kanjis } = data;
  const headword = word.kanji[0] ?? word.readings[0] ?? '\u2014';
  const reading = word.readings[0];
  const engMeanings = word.meanings.filter((m) => m.lang === 'eng');
  const pos = word.meanings[0]?.pos;

  return (
    <>
      {/* Hero */}
      <div className="mb-6 flex items-end gap-6">
        <div>
          <div
            className="text-[48px] leading-none tracking-tight text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            {headword}
          </div>
          {reading && (
            <div
              className="mt-1 text-[18px] text-lgc-fg-muted"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {reading}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {word.grade != null && (
              <span
                className="lgc-chip"
                style={{
                  background: 'var(--lgc-accent-soft)',
                  color: 'var(--lgc-accent)',
                  fontWeight: 600,
                }}
              >
                G{word.grade}
              </span>
            )}
            {pos && <span className="lgc-chip">{pos}</span>}
            {word.is_common && <span className="lgc-chip">common</span>}
          </div>
        </div>
        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={onAddCard}
            className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
          >
            <Plus size={13} /> Add to deck
          </button>
        </div>
      </div>

      {/* Meanings */}
      <div className="mb-6">
        <SectionHead num="01" title="Meanings" />
        {engMeanings.length > 0 ? (
          engMeanings.map((m, i) => (
            <div
              key={i}
              className="flex gap-3.5 py-2"
              style={{ borderTop: i > 0 ? '1px solid var(--lgc-border)' : undefined }}
            >
              <div
                className="pt-0.5 text-[13px] font-semibold text-lgc-accent"
                style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <div className="text-[15px] leading-relaxed text-lgc-fg">{m.meaning}</div>
                {m.pos && (
                  <div className="mt-0.5 text-[11px] italic text-lgc-fg-muted">{m.pos}</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-lgc-fg-muted">&mdash;</p>
        )}
      </div>

      {/* Kanji breakdown */}
      {kanjis.length > 0 && (
        <div className="mb-6">
          <SectionHead num="02" title="Kanji breakdown" />
          <div className="grid grid-cols-2 gap-3">
            {kanjis.map((k) => (
              <button
                key={k.literal}
                type="button"
                onClick={() => onKanjiSearch(k.literal)}
                className="lgc-card flex gap-3 p-3 text-left transition-colors hover:bg-lgc-bg-sunken/50"
              >
                <div
                  className="flex w-12 shrink-0 items-center justify-center text-[36px] leading-none text-lgc-fg"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {k.literal}
                </div>
                <div className="flex-1 text-[12px] leading-relaxed">
                  <div
                    className="mb-0.5 text-[13px] font-medium"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {k.meanings.join(', ') || '\u2014'}
                  </div>
                  <InfoRow label="On" value={k.on_readings.join('\u3001') || '\u2014'} jp />
                  <InfoRow label="Kun" value={k.kun_readings.join('\u3001') || '\u2014'} jp />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Select deck phase ───────────────────────────────────────────────────────

function SelectDeckPhase({
  word,
  onBack,
  onSelectDeck,
  onClose,
}: {
  word: string;
  onBack: () => void;
  onSelectDeck: (deckId: string, deckName: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    decksApi
      .getUserDecks(user.id)
      .then(setDecks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeckName.trim();
    if (!name || !user || creating) return;
    setCreating(true);
    try {
      const deck = await decksApi.createDeck({ userId: user.id, name });
      setDecks((prev) => [...prev, deck]);
      onSelectDeck(deck.id, deck.name);
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-4 py-2.5"
        style={{
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span
          className="text-[13px] font-medium text-lgc-fg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Select a deck
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>

      <div className="lgc-scroll flex-1 overflow-auto p-6">
        <p className="mb-1 text-sm text-lgc-fg-muted">
          Adding{' '}
          <span className="font-medium text-lgc-fg">
            &ldquo;{word}&rdquo;
          </span>{' '}
          as a flashcard
        </p>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
          Choose a deck
        </p>

        {loading ? (
          <p className="text-sm text-lgc-fg-muted">Loading decks&hellip;</p>
        ) : decks.length > 0 ? (
          <div className="space-y-1.5">
            {decks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                onClick={() => onSelectDeck(deck.id, deck.name)}
                className="w-full rounded-md border border-lgc-border bg-lgc-bg px-4 py-3 text-left transition-colors hover:bg-lgc-accent-soft"
              >
                <span className="font-medium text-lgc-fg">{deck.name}</span>
                <span className="ml-2 text-xs text-lgc-fg-muted">
                  {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                </span>
                {deck.description && (
                  <p className="mt-0.5 text-xs text-lgc-fg-subtle">{deck.description}</p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-lgc-fg-muted">No decks yet &mdash; create one below.</p>
        )}

        {showNewDeck ? (
          <form onSubmit={createDeck} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="New deck name"
              className="flex-1 rounded-md border border-lgc-border bg-lgc-bg px-3 py-2 text-sm text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newDeckName.trim() || creating}
              className="rounded-md bg-lgc-accent px-4 py-2 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Create
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewDeck(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-lgc-border px-3 py-2.5 text-sm text-lgc-fg transition-colors hover:bg-lgc-accent-soft"
          >
            <Plus size={14} /> New deck
          </button>
        )}
      </div>
    </>
  );
}

// ── Create card phase ───────────────────────────────────────────────────────

function CreateCardPhase({
  word,
  initialBack,
  initialContext,
  deckId,
  deckName,
  onBack,
  onCreated,
  onClose,
}: {
  word: string;
  initialBack: string;
  initialContext?: string;
  deckId: string;
  deckName: string;
  onBack: () => void;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [back, setBack] = useState(initialBack);
  const [context, setContext] = useState(initialContext ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBack = back.trim();
    if (!trimmedBack || submitting) return;
    setSubmitting(true);
    try {
      await decksApi.createCard(deckId, {
        front: word,
        back: trimmedBack,
        contextSentence: context.trim() || undefined,
      });
      onCreated();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-4 py-2.5"
        style={{
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
        >
          <ArrowLeft size={14} /> Decks
        </button>
        <span
          className="text-[13px] font-medium text-lgc-fg"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          New card
        </span>
        <span className="text-xs text-lgc-fg-muted">
          in &ldquo;{deckName}&rdquo;
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>

      <div className="lgc-scroll flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
          {/* Front (read-only) */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Front
            </label>
            <div
              className="mt-1.5 rounded-md border border-lgc-border bg-lgc-bg-sunken px-4 py-3 text-lg text-lgc-fg"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {word}
            </div>
          </div>

          {/* Back (editable) */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Back
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-md border border-lgc-border bg-lgc-bg px-4 py-3 text-sm leading-relaxed text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
              rows={5}
              autoFocus
            />
          </div>

          {/* Context sentence (editable) */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Context sentence{' '}
              <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="The sentence where you found this word..."
              className="mt-1.5 w-full resize-none rounded-md border border-lgc-border bg-lgc-bg px-4 py-3 text-[13px] leading-relaxed text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md border border-lgc-border px-3 py-2 text-sm text-lgc-fg transition-colors hover:bg-lgc-bg-sunken"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!back.trim() || submitting}
              className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-4 py-2 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check size={14} /> {submitting ? 'Adding\u2026' : 'Add card'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function ResultRow({
  word,
  index,
  active,
  onClick,
}: {
  word: WordResult;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const headword = word.kanji[0] ?? word.readings[0] ?? '\u2014';
  const reading = word.kanji.length > 0 ? word.readings[0] : null;
  const glosses = word.meanings.filter((m) => m.lang === 'eng').map((m) => m.meaning);
  const pos = word.meanings[0]?.pos;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-2.5 border-b border-lgc-border px-4 py-3 text-left transition-colors hover:bg-lgc-bg-elev"
      style={{
        background: active ? 'var(--lgc-bg-elev)' : undefined,
        borderLeft: active ? '2px solid var(--lgc-accent)' : '2px solid transparent',
      }}
    >
      <div
        className="min-w-4.5 pt-1.5 text-[11px] text-lgc-fg-subtle"
        style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="min-w-20 shrink-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[22px] leading-none tracking-tight text-lgc-fg"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
          >
            {headword}
          </span>
          {word.is_common && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-lgc-accent"
              title="Common"
            />
          )}
        </div>
        {reading && (
          <div
            className="mt-1 text-[13px] text-lgc-fg-muted"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {reading}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {word.grade != null && (
            <span
              className="lgc-chip"
              style={{
                background: 'var(--lgc-accent-soft)',
                color: 'var(--lgc-accent)',
                fontWeight: 600,
              }}
            >
              G{word.grade}
            </span>
          )}
          {pos && <span className="lgc-chip">{pos}</span>}
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
    </button>
  );
}

function KanjiPanel({ kanji, onAddCard }: { kanji: KanjiInfo; onAddCard?: () => void }) {
  return (
    <div className="mx-4 mt-4 flex gap-4 rounded-lg border border-lgc-border bg-lgc-bg p-4">
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center text-[48px] leading-none text-lgc-fg"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {kanji.literal}
      </div>
      <div className="flex-1 text-[12.5px] leading-relaxed">
        <div
          className="mb-1 text-[15px] font-medium"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {kanji.meanings.join(', ') || '\u2014'}
        </div>
        <InfoRow label="On" value={kanji.on_readings.join('\u3001') || '\u2014'} jp />
        <InfoRow label="Kun" value={kanji.kun_readings.join('\u3001') || '\u2014'} jp />
        <InfoRow label="Strokes" value={String(kanji.stroke_count ?? '\u2014')} />
        <InfoRow label="Grade" value={kanji.grade != null ? String(kanji.grade) : '\u2014'} />
        {onAddCard && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddCard(); }}
            className="mt-2 flex items-center gap-1.5 rounded-md bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
          >
            <Plus size={13} /> Add to deck
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      <span
        className="text-[11px] font-semibold text-lgc-fg-subtle"
        style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
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
          fontFamily: jp ? 'var(--font-display)' : 'var(--font-mono, Geist Mono, monospace)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
