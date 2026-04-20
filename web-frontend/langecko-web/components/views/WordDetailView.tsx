'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Volume2, Star } from 'lucide-react';

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

export default function WordDetailView({
  id,
  onBack,
  onKanjiSearch,
  onAddCard,
}: {
  id: string;
  onBack?: () => void;
  onKanjiSearch?: (char: string) => void;
  onAddCard?: (word: string, back: string) => void;
}) {
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
    if (onKanjiSearch) {
      onKanjiSearch(char);
    } else {
      router.push(`/dictionary?q=${encodeURIComponent(char)}`);
    }
  };

  const handleBack = onBack ?? (() => router.push('/dictionary'));

  return (
    <div className="@container flex min-h-full w-full flex-col">
      {/* Top bar */}
      <div
        className="flex items-center gap-2.5 border-b border-lgc-border px-5 py-3"
        style={{
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
        >
          <ArrowLeft size={14} />
          Results
        </button>
      </div>

      {/* Content */}
      <div className="lgc-scroll flex-1 overflow-auto">
        <div className="mx-auto max-w-215 px-4 pb-10 pt-5 @md:px-8 @md:pb-16 @md:pt-7">
          {loading && <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
          {error && <p className="text-sm text-lgc-error">{error}</p>}
          {data && <WordBody data={data} onKanjiClick={searchKanji} onAddCard={onAddCard} />}
        </div>
      </div>
    </div>
  );
}

function WordBody({
  data,
  onKanjiClick,
  onAddCard,
}: {
  data: DetailsResponse;
  onKanjiClick: (char: string) => void;
  onAddCard?: (word: string, back: string) => void;
}) {
  const { word, kanjis } = data;
  const headword = word.kanji[0] ?? word.readings[0] ?? '\u2014';
  const reading = word.readings[0];
  const engMeanings = word.meanings.filter((m) => m.lang === 'eng');
  const pos = word.meanings[0]?.pos;

  const handleAddCard = () => {
    if (!onAddCard) return;
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
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="mb-1.5 flex flex-col gap-3 @lg:flex-row @lg:items-end @lg:gap-6">
        <div
          className="text-[44px] leading-none tracking-tight text-lgc-fg @sm:text-[56px] @lg:text-[72px] @2xl:text-[84px]"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          {headword}
        </div>
        <div className="flex-1 @lg:pb-3.5">
          {reading && (
            <div
              className="text-[16px] text-lgc-fg-muted @sm:text-[18px] @lg:text-[22px]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {reading}
            </div>
          )}
          {word.readings.length > 1 && (
            <div
              className="mt-0.5 text-[13px] text-lgc-fg-subtle"
              style={{ fontFamily: 'var(--font-mono, Geist Mono, monospace)' }}
            >
              {word.readings.join(' \u00b7 ')}
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1">
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
        <div className="flex shrink-0 flex-wrap gap-1.5 @lg:flex-col @lg:pb-3">
          <button
            type="button"
            onClick={handleAddCard}
            disabled={!onAddCard}
            className="flex items-center gap-1.5 rounded-md bg-lgc-accent px-3 py-1.5 text-xs font-medium text-lgc-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={13} /> Add to deck
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-xs font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
          >
            <Volume2 size={13} /> Play audio
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev hover:text-lgc-fg"
          >
            <Star size={13} /> Save word
          </button>
        </div>
      </div>

      {/* ── 01 Meanings ──────────────────────────────────────────── */}
      <SectionHead num="01" title="Meanings" />
      <div className="mb-8">
        {engMeanings.length > 0 ? (
          engMeanings.map((m, i) => (
            <div
              key={`${m.lang}-${i}`}
              className="flex gap-3.5 py-2.5"
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

      {/* ── 02 Kanji breakdown ───────────────────────────────────── */}
      {kanjis.length > 0 && (
        <>
          <SectionHead num="02" title="Kanji breakdown" />
          <div className="mb-8 grid grid-cols-1 gap-3 @lg:grid-cols-2">
            {kanjis.map((k) => (
              <button
                key={k.literal}
                type="button"
                onClick={() => onKanjiClick(k.literal)}
                className="lgc-card flex gap-3 p-3 text-left transition-colors hover:bg-lgc-bg-sunken/50 @sm:gap-4 @sm:p-4"
              >
                <div
                  className="flex w-14 shrink-0 items-center justify-center text-[40px] leading-none text-lgc-fg @sm:w-18 @sm:border-r @sm:border-lgc-border @sm:pr-3 @sm:text-[56px] @lg:w-22 @lg:text-[72px]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {k.literal}
                </div>
                <div className="flex-1 text-[12.5px] leading-relaxed">
                  <div
                    className="mb-1 text-[15px] font-medium"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {k.meanings.join(', ') || '\u2014'}
                  </div>
                  <InfoRow label="On" value={k.on_readings.join('\u3001') || '\u2014'} jp />
                  <InfoRow label="Kun" value={k.kun_readings.join('\u3001') || '\u2014'} jp />
                  <InfoRow label="Strokes" value={String(k.stroke_count ?? '\u2014')} />
                  <InfoRow label="Grade" value={k.grade != null ? String(k.grade) : '\u2014'} />
                  <InfoRow
                    label="Radical"
                    value={k.radical != null ? String(k.radical) : '\u2014'}
                  />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="flex justify-end gap-1.5 text-[11px] text-lgc-fg-subtle">
        Source &middot; JMdict
      </div>
    </>
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
