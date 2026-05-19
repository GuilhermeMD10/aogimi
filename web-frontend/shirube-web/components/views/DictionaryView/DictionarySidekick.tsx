'use client';

// Dictionary sidekick — docked on the right side of the reader page (~25% of
// viewport). Implements the "Sidekick" variant from the Dictionary handoff:
//   - sticky top bar with a 24px DICT badge, a small focused search and a
//     close button
//   - "Ready" prompt block with keyboard chips when the search is empty
//   - a single-column dense list of recent lookups
// Reads/writes the same DictionaryStateProvider as /dictionary and the reader
// bubble, so a search in any of the three shows up in the others.

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { useDictionaryState } from '@/components/providers/DictionaryStateProvider';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import WordDetailView, { preferredHeadword } from '@/components/views/WordDetailView';
import type { WordResult } from '@/lib/types';
import { getRecentSearches, type RecentSearchItem } from '@/lib/storage/dictionary';

export type DictionarySidekickProps = {
  onClose: () => void;
};

export function DictionarySidekick({ onClose }: DictionarySidekickProps) {
  const { setPendingCard } = useReaderState();
  const {
    query,
    result,
    loading,
    error,
    selectedWordId,
    lastContextSentence,
    setQuery,
    setSelectedWordId,
    runSearch,
  } = useDictionaryState();

  const [recents, setRecents] = useState<RecentSearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate the recent list on mount and refresh it whenever a fresh result
  // comes in (the provider pushes to localStorage on every successful search).
  useEffect(() => { setRecents(getRecentSearches()); }, [result]);

  // Esc closes the sidekick when the search input is empty; otherwise it just
  // clears the input. Per handoff §6.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active === inputRef.current) {
        if (query) { setQuery(''); }
        else       { onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query, setQuery, onClose]);

  // Preserve the backend-supplied order — see services/searchService.js.
  const words = result && 'words' in result ? result.words : [];
  const kanjiInfo = result?.type === 'kanji' ? result.kanji : null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query);
  };

  if (selectedWordId !== null) {
    return (
      <div
        className="flex h-full flex-col"
        style={{ background: 'var(--lgc-bg)', borderLeft: '1px solid var(--lgc-border)' }}
      >
        <SidekickTopBar
          inputRef={inputRef}
          query={query}
          setQuery={setQuery}
          onSubmit={onSubmit}
          onClose={onClose}
          loading={loading}
        />
        <div className="lgc-scroll flex-1 overflow-auto">
          <WordDetailView
            id={String(selectedWordId)}
            query={query}
            onBack={() => setSelectedWordId(null)}
            onKanjiSearch={(char) => { void runSearch(char); }}
            onAddCard={(word, back) => setPendingCard({ word, back, contextSentence: lastContextSentence })}
          />
        </div>
      </div>
    );
  }

  const hasResults = words.length > 0 || kanjiInfo !== null;

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'var(--lgc-bg)', borderLeft: '1px solid var(--lgc-border)' }}
    >
      <SidekickTopBar
        inputRef={inputRef}
        query={query}
        setQuery={setQuery}
        onSubmit={onSubmit}
        onClose={onClose}
        loading={loading}
      />

      <div className="lgc-scroll flex-1 overflow-auto" style={{ padding: '20px 22px 40px' }}>
        {error && (
          <p style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--lgc-error, #c14a3a)' }}>{error}</p>
        )}

        {!hasResults && !loading && (
          <ReadyBlock />
        )}

        {hasResults && (
          <ResultsList
            query={query}
            words={words}
            onSelect={(id) => setSelectedWordId(id)}
          />
        )}

        {!hasResults && !loading && (
          <RecentList
            items={recents}
            onPick={(q) => { setQuery(q); void runSearch(q); }}
          />
        )}
      </div>
    </div>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────────

function SidekickTopBar({
  inputRef,
  query,
  setQuery,
  onSubmit,
  onClose,
  loading,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
}) {
  // Focus the search on mount so opening the sidekick lands the cursor.
  useEffect(() => { inputRef.current?.focus(); }, [inputRef]);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--lgc-border)',
        background: 'color-mix(in oklab, var(--lgc-bg-elev) 88%, transparent)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      <span
        aria-hidden
        className="font-display"
        style={{
          width: 24,
          height: 24,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          background: 'var(--lgc-accent-soft, color-mix(in oklab, var(--lgc-accent) 16%, transparent))',
          color: 'var(--lgc-accent)',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        辞
      </span>
      <span
        style={{
          fontFamily: 'var(--lgc-font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--lgc-fg-muted)',
        }}
      >
        DICT
      </span>
      <span aria-hidden style={{ width: 1, height: 14, background: 'var(--lgc-border)' }} />

      <form onSubmit={onSubmit} style={{ flex: 1, display: 'flex' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--lgc-bg-elev)',
            border: '1px solid var(--lgc-border-strong)',
            borderRadius: 'var(--lgc-input-radius, 6px)',
            padding: '5px 8px',
          }}
        >
          <Search size={12} style={{ color: 'var(--lgc-fg-subtle)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={loading ? 'Searching…' : 'Look up'}
            className="flex-1 border-none bg-transparent text-[13px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle"
          />
        </div>
      </form>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close dictionary"
        title="Close (Esc)"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function ReadyBlock() {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--lgc-accent)',
          marginBottom: 6,
        }}
      >
        Ready
      </div>
      <div
        className="font-display"
        style={{
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--lgc-fg)',
          lineHeight: 1.3,
        }}
      >
        Tap a word in the reader, or type to look one up.
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <KeyChip kbd="S" label="save card" />
        <KeyChip kbd="Esc" label="back to reader" />
      </div>
    </div>
  );
}

function KeyChip({ kbd, label }: { kbd: string; label: string }) {
  return (
    <span
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 7px',
        borderRadius: 999,
        border: '1px solid var(--lgc-border)',
        background: 'var(--lgc-bg-elev)',
        fontSize: 11,
        color: 'var(--lgc-fg-muted)',
      }}
    >
      <kbd
        style={{
          fontFamily: 'var(--lgc-font-mono)',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--lgc-fg)',
          background: 'var(--lgc-bg-sunken)',
          border: '1px solid var(--lgc-border)',
          borderRadius: 3,
          padding: '0 4px',
        }}
      >
        {kbd}
      </kbd>
      {label}
    </span>
  );
}

// ── Recent list ─────────────────────────────────────────────────────────────

function RecentList({
  items,
  onPick,
}: {
  items: RecentSearchItem[];
  onPick: (q: string) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--lgc-fg-muted)',
          }}
        >
          Recent
        </div>
        <span
          style={{
            fontSize: 10,
            fontStyle: 'italic',
            color: 'var(--lgc-fg-subtle)',
          }}
          title="Recent lookups are stored on this device only. Server sync is coming."
        >
          (saved locally — server sync coming soon)
        </span>
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--lgc-fg-muted)', lineHeight: 1.5 }}>
          Open a book and tap a word — your lookups will land here.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 8).map((it, i) => (
            <button
              key={`${it.query}-${i}`}
              type="button"
              onClick={() => onPick(it.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--lgc-border)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--lgc-bg-elev)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span
                className="font-display"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 14,
                  color: 'var(--lgc-fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingLeft: 4,
                }}
              >
                {it.query}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'var(--lgc-font-mono)', color: 'var(--lgc-fg-muted)' }}>
                {formatRelative(it.at)}
              </span>
              <ChevronRight size={11} style={{ color: 'var(--lgc-fg-subtle)', flexShrink: 0, marginRight: 4 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Results list ────────────────────────────────────────────────────────────

function ResultsList({
  query,
  words,
  onSelect,
}: {
  query: string;
  words: WordResult[];
  onSelect: (id: number) => void;
}) {
  if (words.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--lgc-accent)',
          marginBottom: 4,
        }}
      >
        Results
      </div>
      <div className="font-display" style={{ fontSize: 14, color: 'var(--lgc-fg-muted)', marginBottom: 12 }}>
        {words.length} for <span style={{ color: 'var(--lgc-accent)' }}>「{query}」</span>
      </div>

      <div>
        {words.slice(0, 12).map((word) => {
          const headword = preferredHeadword(word, query);
          const reading = word.kanji.length > 0 ? word.readings[0]?.form ?? null : null;
          const glosses = word.meanings.filter((m) => m.lang === 'eng').map((m) => m.meaning);
          return (
            <button
              key={word.id}
              type="button"
              onClick={() => onSelect(word.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 0',
                borderBottom: '1px solid var(--lgc-border)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  className="font-display"
                  style={{
                    fontSize: 18,
                    color: 'var(--lgc-fg)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {headword}
                </span>
                {reading && (
                  <span style={{ fontSize: 11, color: 'var(--lgc-fg-muted)', fontFamily: 'var(--lgc-font-display)' }}>
                    {reading}
                  </span>
                )}
              </div>
              {glosses.length > 0 && (
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: 12.5,
                    color: 'var(--lgc-fg-muted)',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {glosses.slice(0, 3).join('; ')}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}
