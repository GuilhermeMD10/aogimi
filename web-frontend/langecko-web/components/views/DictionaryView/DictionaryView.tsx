'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Search, Plus, Volume2 } from 'lucide-react';
import { useReaderState } from '@/components/providers/ReaderStateProvider';
import { useDictionaryState } from '@/components/providers/DictionaryStateProvider';
import WordDetailView, { preferredHeadword } from '@/components/views/WordDetailView';
import { InfoRow } from '@/components/ui/InfoRow';
import { JlptChip } from '@/components/ui/JlptChip';
import { SectionHead } from '@/components/ui/SectionHead';
import {
  meanWordGrade,
  type KanjiInfo,
  type WordResult,
} from '@/lib/dictApi';

export default function DictionaryView() {
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

  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q');
  const lastUrlQueryRef = useRef<string | null>(null);

  // Deep-link entry: `/workspace?q=<term>` runs the search once.
  useEffect(() => {
    if (!urlQuery) return;
    if (lastUrlQueryRef.current === urlQuery) return;
    lastUrlQueryRef.current = urlQuery;
    void runSearch(urlQuery);
  }, [urlQuery, runSearch]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void runSearch(query);
  };

  const rawWords = result ? ('words' in result ? result.words : []) : [];
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
          void runSearch(char);
        }}
        onAddCard={(word, back) => setPendingCard({ word, back, contextSentence: lastContextSentence })}
      />
    );
  }

  return (
    <div className="@container flex min-h-full w-full flex-col">
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-3 py-2.5 @md:px-5 @md:py-3"
        style={{
          background: 'var(--lgc-toolbar-bg)',
          backdropFilter: 'var(--lgc-toolbar-backdrop-filter)',
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 items-center gap-2 border border-lgc-border-strong bg-lgc-bg-elev px-3 py-2"
          style={{ maxWidth: 540, borderRadius: 'var(--lgc-input-radius)' }}
        >
          <Search size={14} className="shrink-0 text-lgc-fg-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kanji, kana, or English..."
            className="flex-1 border-none bg-transparent text-[15px] text-lgc-fg outline-none placeholder:text-lgc-fg-subtle font-display"
          />
          <kbd
            className="border border-lgc-border-strong px-1.5 py-0.5 text-[10px] text-lgc-fg-muted font-mono"
            style={{ borderRadius: 'var(--lgc-kbd-radius)', }}
          >
            ⌘K
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
              borderRadius: 'var(--lgc-toolbar-button-radius)',
              fontFamily: 'var(--lgc-toolbar-button-font-family)',
              letterSpacing: 'var(--lgc-toolbar-button-tracking)',
              textTransform: 'var(--lgc-toolbar-button-text-transform)' as React.CSSProperties['textTransform'],
            }}
          >
            {loading ? 'Searching…' : 'JA → EN'}
          </button>
        </div>
      </div>

      <div className="lgc-scroll flex-1 overflow-auto">
        {error && <p className="px-5 py-3 text-sm text-lgc-error">{error}</p>}

        {kanjiInfo && (
          <KanjiPanel
            kanji={kanjiInfo}
            onAddCard={() => {
              const parts: string[] = [];
              if (kanjiInfo.on_readings.length > 0) parts.push(kanjiInfo.on_readings.join('、'));
              if (kanjiInfo.kun_readings.length > 0) parts.push(kanjiInfo.kun_readings.join('、'));
              if (kanjiInfo.meanings.length > 0) parts.push(kanjiInfo.meanings.join(', '));
              setPendingCard({ word: kanjiInfo.literal, back: parts.join('\n'), contextSentence: lastContextSentence });
            }}
          />
        )}

        {words.length > 0 && (
          <>
            <div className="px-3 pb-1.5 pt-4 @md:px-5 @md:pt-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-accent">
                Dictionary
              </div>
              <div
                className="mt-1 text-[16px] font-medium tracking-tight text-lgc-fg @sm:text-[18px] @lg:text-[22px] font-display"
                style={{ letterSpacing: '-0.01em' }}
              >
                {words.length} result{words.length !== 1 ? 's' : ''} for{' '}
                <span className="text-lgc-accent">「{query}」</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between px-3 pb-3 @md:px-5">
              <span className="text-xs text-lgc-fg-muted">
                Showing JMdict entries &middot; kanji, reading, and cross-reference matches
              </span>
              <span
                className="text-[11px] text-lgc-fg-muted font-mono"
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

        {names.length > 0 && (
          <div className="px-3 pb-6 @md:px-5">
            <SectionHead num="02" title="Names" />
            <div
              className="overflow-hidden border border-lgc-border"
              style={{ borderRadius: 'var(--lgc-surface-radius)' }}
            >
              {names.slice(0, 10).map((name) => (
                <div
                  key={name.id}
                  className="border-b border-lgc-border px-4 py-2.5 text-sm last:border-0"
                >
                  <span
                    className="font-medium text-lgc-fg font-display"
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

        {!loading && !error && result && words.length === 0 && names.length === 0 && !kanjiInfo && (
          <p className="px-5 py-6 text-sm text-lgc-fg-muted">No results found.</p>
        )}
      </div>
    </div>
  );
}

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
        borderBottomStyle: 'var(--lgc-divider-style)' as React.CSSProperties['borderBottomStyle'],
      }}
    >
      <div
        className="hidden min-w-4.5 pt-1.5 text-[11px] @sm:block font-mono"
        style={{ color: 'var(--lgc-section-num-color)',
          letterSpacing: 'var(--lgc-section-num-tracking)', }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="min-w-0 shrink-0 text-left @sm:min-w-20 @lg:min-w-30">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[20px] leading-none tracking-tight text-lgc-fg @sm:text-[24px] @lg:text-[30px] font-display"
            style={{ letterSpacing: '-0.01em' }}
          >
            {headword}
          </span>
          {word.is_common && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 bg-lgc-accent"
              style={{ borderRadius: 'var(--lgc-pill-radius)' }}
              title="Common"
            />
          )}
        </div>
        {reading && (
          <div
            className="mt-1 text-[13px] font-display"
            style={{ color: 'var(--lgc-row-reading-color)',
              letterSpacing: 'var(--lgc-row-reading-tracking)', }}
          >
            {reading}
          </div>
        )}
      </div>

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

      <div className="hidden shrink-0 flex-col items-end gap-1 @md:flex">
        <span
          className="border border-lgc-border p-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
          style={{ borderRadius: 'var(--lgc-icon-button-radius)' }}
          title="Add to flashcards"
        >
          <Plus size={14} />
        </span>
        <span
          className="border border-lgc-border p-1.5 text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken"
          style={{ borderRadius: 'var(--lgc-icon-button-radius)' }}
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
  onAddCard,
}: {
  kanji: KanjiInfo;
  onAddCard?: () => void;
}) {
  return (
    <div
      className="mx-3 mt-4 flex flex-col gap-3 border border-lgc-border bg-lgc-bg-elev p-4 @sm:mx-5 @sm:mt-5 @sm:flex-row @sm:gap-4 @sm:p-5"
      style={{
        borderRadius: 'var(--lgc-surface-radius)',
        boxShadow: 'var(--lgc-surface-shadow)',
      }}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center text-[48px] leading-none text-lgc-fg @sm:h-22 @sm:w-22 @sm:border-r @sm:border-lgc-border @sm:pr-3 @sm:text-[72px] font-display"
      >
        {kanji.literal}
      </div>
      <div className="flex-1 text-[12.5px] leading-relaxed">
        <div
          className="mb-1 font-medium font-display"
          style={{ color: 'var(--lgc-kanji-meanings-color)',
            fontSize: 'var(--lgc-kanji-meanings-size)', }}
        >
          {kanji.meanings.join(', ') || '—'}
        </div>
        <InfoRow label="On" value={kanji.on_readings.join('、') || '—'} jp />
        <InfoRow label="Kun" value={kanji.kun_readings.join('、') || '—'} jp />
        <InfoRow label="Strokes" value={String(kanji.stroke_count ?? '—')} />
        <InfoRow label="Grade" value={kanji.grade != null ? String(kanji.grade) : '—'} />
        <InfoRow label="JLPT" value={kanji.jlpt_level != null ? `N${kanji.jlpt_level}` : '—'} />
        <InfoRow label="Radical" value={kanji.radical != null ? String(kanji.radical) : '—'} />
        {onAddCard && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddCard(); }}
            className="mt-2 flex items-center gap-1.5 bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
            style={{
              borderRadius: 'var(--lgc-button-radius)',
              borderWidth: 'var(--lgc-button-border-width)',
              borderStyle: 'var(--lgc-button-border-style)' as React.CSSProperties['borderStyle'],
              borderColor: 'var(--lgc-button-border-color)',
              boxShadow: 'var(--lgc-button-shadow)',
              fontFamily: 'var(--lgc-button-font-family)',
              letterSpacing: 'var(--lgc-button-letter-spacing)',
              textTransform: 'var(--lgc-button-text-transform)' as React.CSSProperties['textTransform'],
            }}
          >
            <Plus size={13} /> Add to deck
          </button>
        )}
      </div>
    </div>
  );
}
