'use client';

// All ReaderBubble logic that lives INSIDE the outer bubble shell.

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Plus, Search, X } from 'lucide-react';
import { useAuthedUser } from '@/components/providers/useAuthedUser';
import { useDictionaryState, preferredHeadword, getWordDetails } from '@/features/dictionary';
import * as decksApi from '@/components/decks/utils/decksApi';
import type { DeckRecord } from '@/components/decks/types';
import type {
  DetailsResponse,
  KanjiInfo,
  SearchResponse,
  WordResult,
} from '@/features/dictionary/types';
import { InfoRow } from '@/shared/ui/InfoRow';
import { SectionHead } from '@/shared/ui/SectionHead';
import { MAX_MEANINGS_ON_CARD } from '@/components/decks/utils/cardLimits';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { PitchAccentDiagram } from '@/shared/ui/PitchAccentDiagram';

// Local (bubble-only) UI flow. Dictionary state itself lives in the
// DictionaryStateProvider so the /dictionary page stays in sync.
type Phase =
  | { type: 'dict' }
  | { type: 'select-deck'; word: string; back: string; contextSentence?: string }
  | { type: 'create-card'; word: string; back: string; deckId: string; deckName: string; contextSentence?: string };

export type BubbleContentProps =
  | { mode: 'dict'; onClose: () => void }
  | {
      mode: 'addCard';
      word: string;
      back: string;
      contextSentence?: string;
      onClose: () => void;
    };

export function BubbleContent(props: BubbleContentProps) {
  const dict = useDictionaryState();
  const [phase, setPhase] = useState<Phase>(
    props.mode === 'addCard'
      ? { type: 'select-deck', word: props.word, back: props.back, contextSentence: props.contextSentence }
      : { type: 'dict' },
  );

  // In addCard mode, sync the provider with the word being carded so that the
  // back-button on select-deck returns to a sensible dictionary view.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (props.mode === 'addCard') {
      void dict.runSearch(props.word, props.contextSentence);
    }
  }, [props, dict]);

  if (phase.type === 'dict') {
    if (dict.selectedWordId !== null) {
      return (
        <WordDetailPhase
          wordId={dict.selectedWordId}
          query={dict.query}
          onBack={() => dict.setSelectedWordId(null)}
          onAddCard={(word, back, contextSentence) =>
            setPhase({ type: 'select-deck', word, back, contextSentence })
          }
          onKanjiSearch={(char) => { void dict.runSearch(char); }}
          onClose={props.onClose}
        />
      );
    }
    return (
      <SearchPhase
        query={dict.query}
        setQuery={dict.setQuery}
        result={dict.result}
        loading={dict.loading}
        error={dict.error}
        onSubmit={(e) => { e.preventDefault(); void dict.runSearch(dict.query); }}
        onWordClick={(id) => dict.setSelectedWordId(id)}
        onAddKanjiCard={(word, back) => setPhase({ type: 'select-deck', word, back })}
        onClose={props.onClose}
      />
    );
  }

  if (phase.type === 'select-deck') {
    return (
      <SelectDeckPhase
        word={phase.word}
        onBack={() => setPhase({ type: 'dict' })}
        onSelectDeck={(id, name) =>
          setPhase({
            type: 'create-card',
            word: phase.word,
            back: phase.back,
            contextSentence: phase.contextSentence,
            deckId: id,
            deckName: name,
          })
        }
        onClose={props.onClose}
      />
    );
  }

  // Prefer the phase-carried context — WordDetailPhase fills it with
  // the first dict example sentence when no reader context was passed,
  // so this covers both "added from reader" and "added from dict view"
  // flows without the dict view leaving the field empty.
  const contextSentence = phase.contextSentence ?? dict.lastContextSentence;
  return (
    <CreateCardPhase
      word={phase.word}
      initialBack={phase.back}
      initialContext={contextSentence}
      deckId={phase.deckId}
      deckName={phase.deckName}
      onBack={() =>
        setPhase({
          type: 'select-deck',
          word: phase.word,
          back: phase.back,
          contextSentence: phase.contextSentence,
        })
      }
      onCreated={props.onClose}
      onClose={props.onClose}
    />
  );
}

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
  // Preserve the backend-supplied order — see services/searchService.js.
  const words = result && 'words' in result ? result.words : [];
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
            className="flex-1 border-none bg-transparent text-[15px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle font-display"
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
              if (kanjiInfo.on_readings.length > 0) parts.push(kanjiInfo.on_readings.join('、'));
              if (kanjiInfo.kun_readings.length > 0) parts.push(kanjiInfo.kun_readings.join('、'));
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
                className="mt-1 text-[16px] font-medium tracking-tight text-lgc-fg font-display"
                style={{ letterSpacing: '-0.01em' }}
              >
                {words.length} result{words.length !== 1 ? 's' : ''} for{' '}
                <span className="text-lgc-accent">「{query}」</span>
              </div>
            </div>
            <div className="border-t border-lgc-border">
              {words.slice(0, 15).map((word, i) => (
                <ResultRow
                  key={word.id}
                  word={word}
                  index={i}
                  active={i === 0}
                  query={query}
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

function WordDetailPhase({
  wordId,
  query,
  onBack,
  onAddCard,
  onKanjiSearch,
  onClose,
}: {
  wordId: number;
  query?: string;
  onBack: () => void;
  onAddCard: (word: string, back: string, contextSentence?: string) => void;
  onKanjiSearch: (char: string) => void;
  onClose: () => void;
}) {
  const { data, loading, error } = useFetchWithAbort<DetailsResponse>(
    (signal) => getWordDetails(wordId, signal),
    [wordId],
  );

  const handleAddCard = () => {
    if (!data) return;
    const { word } = data;
    const headword = preferredHeadword(word, query);
    const reading = word.readings[0]?.form;
    const engMeanings = word.meanings.filter((m) => m.lang === 'eng');

    const parts: string[] = [];
    if (reading) parts.push(reading);
    if (engMeanings.length > 0) {
      const cappedMeanings = engMeanings.slice(0, MAX_MEANINGS_ON_CARD);
      parts.push(cappedMeanings.map((m, i) => `${i + 1}. ${m.meaning}`).join('\n'));
    }
    // Auto-fill context with the first example sentence the dict already
    // loaded. The caller decides whether to prefer a reader-provided
    // sentence over this fallback.
    const contextFallback = data.sentences[0]?.ja;
    onAddCard(headword, parts.join('\n'), contextFallback);
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
              query={query}
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
  query,
  onKanjiSearch,
  onAddCard,
}: {
  data: DetailsResponse;
  query?: string;
  onKanjiSearch: (char: string) => void;
  onAddCard: () => void;
}) {
  const { word, kanjis } = data;
  const headword = preferredHeadword(word, query);
  const primaryReading = word.readings[0];
  const reading = primaryReading?.form;
  const engMeanings = word.meanings.filter((m) => m.lang === 'eng');
  const pos = word.meanings[0]?.pos;

  return (
    <>
      <div className="mb-6 flex items-end gap-6">
        <div>
          <div
            className="text-[48px] leading-none tracking-tight text-lgc-fg font-display"
            style={{ letterSpacing: '-0.02em' }}
          >
            {headword}
          </div>
          {reading && (
            <div
              className="mt-1 text-[18px] text-lgc-fg-muted font-display"
            >
              {reading}
            </div>
          )}
          {primaryReading?.pitchAccents && (
            <div className="mt-2">
              <PitchAccentDiagram
                reading={primaryReading.form}
                pitchAccents={primaryReading.pitchAccents}
                size="sm"
              />
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
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
                className="pt-0.5 text-[13px] font-semibold text-lgc-accent font-mono"
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
                  className="flex w-12 shrink-0 items-center justify-center text-[36px] leading-none text-lgc-fg font-display"
                >
                  {k.literal}
                </div>
                <div className="flex-1 text-[12px] leading-relaxed">
                  <div
                    className="mb-0.5 text-[13px] font-medium font-display"
                  >
                    {k.meanings.join(', ') || '—'}
                  </div>
                  <InfoRow label="On" value={k.on_readings.join('、') || '—'} jp />
                  <InfoRow label="Kun" value={k.kun_readings.join('、') || '—'} jp />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

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
  const user = useAuthedUser();
  const { data: fetchedDecks, loading } = useFetchWithAbort<DeckRecord[]>(
    (signal) => decksApi.getUserDecks(user.id, signal),
    [user.id],
  );
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  useEffect(() => {
    if (fetchedDecks) setDecks(fetchedDecks);
  }, [fetchedDecks]);
  // New-deck-form composite state. `null` = form closed; object = form open
  // with current input + busy flag. Collapses showNewDeck + newDeckName + creating.
  const [newDeckDraft, setNewDeckDraft] = useState<{ name: string; creating: boolean } | null>(null);
  const showNewDeck = newDeckDraft !== null;
  const newDeckName = newDeckDraft?.name ?? '';
  const creating = newDeckDraft?.creating ?? false;

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeckName.trim();
    if (!name || creating) return;
    setNewDeckDraft({ name, creating: true });
    try {
      const deck = await decksApi.createDeck({ userId: user.id, name });
      setDecks((prev) => [...prev, deck]);
      onSelectDeck(deck.id, deck.name);
    } catch {
      /* ignore */
    } finally {
      setNewDeckDraft(null);
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
        <span className="text-[13px] font-medium text-lgc-fg font-display">
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
              onChange={(e) => setNewDeckDraft((d) => ({ name: e.target.value, creating: d?.creating ?? false }))}
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
            onClick={() => setNewDeckDraft({ name: '', creating: false })}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-lgc-border px-3 py-2.5 text-sm text-lgc-fg transition-colors hover:bg-lgc-accent-soft"
          >
            <Plus size={14} /> New deck
          </button>
        )}
      </div>
    </>
  );
}

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
        <span className="text-[13px] font-medium text-lgc-fg font-display">
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
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Front
            </label>
            <div className="mt-1.5 rounded-md border border-lgc-border bg-lgc-bg-sunken px-4 py-3 text-lg text-lgc-fg font-display">
              {word}
            </div>
          </div>

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
              className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-3 py-2 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check size={14} /> {submitting ? 'Adding…' : 'Add card'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Search-result row ───────────────────────────────────────────────────────

function ResultRow({
  word,
  index,
  active,
  query,
  onClick,
}: {
  word: WordResult;
  index: number;
  active: boolean;
  query: string;
  onClick: () => void;
}) {
  const headword = preferredHeadword(word, query);
  const reading = word.kanji.length > 0 ? word.readings[0]?.form ?? null : null;
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
      <div className="min-w-4.5 pt-1.5 text-[11px] text-lgc-fg-subtle font-mono">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="min-w-20 shrink-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[22px] leading-none tracking-tight text-lgc-fg font-display"
            style={{ letterSpacing: '-0.01em' }}
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
          <div className="mt-1 text-[13px] text-lgc-fg-muted font-display">
            {reading}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {pos && <span className="lgc-chip">{pos}</span>}
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
    </button>
  );
}

function KanjiPanel({ kanji, onAddCard }: { kanji: KanjiInfo; onAddCard?: () => void }) {
  return (
    <div className="mx-4 mt-4 flex gap-4 rounded-lg border border-lgc-border bg-lgc-bg p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center text-[48px] leading-none text-lgc-fg font-display">
        {kanji.literal}
      </div>
      <div className="flex-1 text-[12.5px] leading-relaxed">
        <div className="mb-1 text-[15px] font-medium font-display">
          {kanji.meanings.join(', ') || '—'}
        </div>
        <InfoRow label="On" value={kanji.on_readings.join('、') || '—'} jp />
        <InfoRow label="Kun" value={kanji.kun_readings.join('、') || '—'} jp />
        <InfoRow label="Strokes" value={String(kanji.stroke_count ?? '—')} />
        <InfoRow label="Grade" value={kanji.grade != null ? String(kanji.grade) : '—'} />
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
